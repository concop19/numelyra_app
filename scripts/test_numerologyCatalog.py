"""Regression tests for catalog rejection, including a failed build's atomicity."""

import hashlib
import json
import sqlite3
import tempfile
import unittest
from contextlib import closing
from pathlib import Path
from unittest.mock import patch

import buildBilingualNumerologyDb as builder
from numerologyCatalog import ROOT, quality_findings, source_revision, validate_catalog


def article(indicator: str, value: str, text: str) -> dict:
    return {'indicator_key': indicator, 'number_value': value, 'title': f'{indicator} {value}',
            'content': text, 'review_status': 'approved', 'reviewed_by': 'test-reviewer'}


class CatalogQualityTests(unittest.TestCase):
    def test_identical_cross_indicator_section_is_rejected(self):
        common = 'A shared section containing useful but copied interpretation.'
        rows = [article('mission', '1', f'# Overview\nAn independent purpose.\n# Strengths\n{common}'),
                article('soul', '1', f'# Overview\nA private desire.\n# Strengths\n{common}')]
        errors, _ = quality_findings(rows, 'en')
        self.assertTrue(any('identical article/section' in error for error in errors))

    def test_near_duplicates_are_queued_with_both_revisions(self):
        body = ' '.join(f'word{i}' for i in range(150))
        rows = [article('mission', '1', '# Overview\n' + body),
                article('mission', '2', '# Overview\n' + body + ' different ending')]
        errors, queue = quality_findings(rows, 'en')
        self.assertEqual(errors, [])
        self.assertEqual(len(queue), 1)
        self.assertGreater(queue[0]['score'], .85)
        for row in rows:
            self.assertIn(source_revision(row['title'], row['content']), queue[0]['id'])

    def test_unapproved_stale_or_shortened_translation_is_rejected(self):
        vi = article('mission', '1', '# Overview\n' + 'Original paragraph. ' * 10 + '\n# Guidance\nOriginal advice.')
        en = article('mission', '1', '# Overview\n' + 'A translated paragraph. ' * 10)
        en.update(review_status='draft', source_revision='stale')
        with patch('numerologyCatalog.required_keys', return_value={'mission|1'}):
            errors, _ = validate_catalog([vi], [en])
        self.assertTrue(any('approval required' in error for error in errors))
        self.assertTrue(any('stale source_revision' in error for error in errors))
        self.assertTrue(any('section count differs' in error for error in errors))

    def test_failed_build_leaves_existing_database_unchanged(self):
        cache = ROOT / '.jest-cache'
        cache.mkdir(exist_ok=True)
        with tempfile.TemporaryDirectory(dir=cache) as directory:
            target = Path(directory) / 'catalog.db'
            target.write_bytes(b'previous database artifact')
            before = hashlib.sha256(target.read_bytes()).hexdigest()
            with patch.object(builder, 'vietnamese_rows', return_value=[]), patch.object(builder, 'load_rows', return_value=[]):
                with self.assertRaises(SystemExit):
                    builder.build_database(target)
            self.assertEqual(hashlib.sha256(target.read_bytes()).hexdigest(), before)
            self.assertFalse(target.with_suffix('.staged.db').exists())

    def test_successful_build_closes_handles_before_replacing_on_windows(self):
        cache = ROOT / '.jest-cache'
        cache.mkdir(exist_ok=True)
        with tempfile.TemporaryDirectory(dir=cache) as directory:
            root = Path(directory)
            data = root / 'src/data'
            data.mkdir(parents=True)
            (data / 'numerologyEnglishGlossary.json').write_text(json.dumps({'terms': {'mission': 'Destiny'}}), encoding='utf-8')
            target = root / 'catalog.db'
            with closing(sqlite3.connect(target)) as db:
                db.execute('CREATE TABLE numerology_knowledge (old_column TEXT)')
                db.execute('CREATE TABLE preserved_data (value TEXT)')
                db.execute("INSERT INTO preserved_data VALUES ('keep this row')")
                db.commit()
            vi = article('mission', '1', '# Overview\n' + 'Source text. ' * 12)
            en = article('mission', '1', '# Overview\n' + 'Translated text. ' * 12)
            with patch.object(builder, 'ROOT', root), patch.object(builder, 'DB_PATH', target), \
                 patch.object(builder, 'vietnamese_rows', return_value=[vi]), \
                 patch.object(builder, 'load_rows', return_value=[en]), \
                 patch.object(builder, 'validate_catalog', return_value=([], [])):
                builder.build_database(target)
            with closing(sqlite3.connect(target)) as db:
                self.assertEqual(db.execute('PRAGMA user_version').fetchone()[0], 5)
                self.assertEqual(db.execute('SELECT COUNT(*) FROM numerology_knowledge').fetchone()[0], 2)
                self.assertEqual(db.execute('SELECT value FROM preserved_data').fetchone()[0], 'keep this row')
            self.assertFalse(target.with_suffix('.staged.db').exists())


if __name__ == '__main__':
    unittest.main()
