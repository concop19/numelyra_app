"""Verify exact coverage, editorial quality, revisions, and source/bundle parity."""

from __future__ import annotations

import argparse
import json
import sqlite3
import sys

from numerologyCatalog import (
    DATABASE_VERSION, EN_PATH, ROOT, key, load_rows, required_keys,
    source_revision, validate_catalog, vietnamese_rows,
)

DB_PATH = ROOT / 'assets/cadao.db'


def main() -> None:
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    parser = argparse.ArgumentParser()
    # Kept for existing CI callers. Approval is mandatory in every mode now.
    parser.add_argument('--require-approved', action='store_true')
    parser.add_argument('--catalog-only', action='store_true')
    parser.add_argument('--report', help='Write a machine-readable report, including the similarity review queue')
    args = parser.parse_args()
    vi, en = vietnamese_rows(), load_rows(EN_PATH)
    errors, similarities = validate_catalog(vi, en)
    report = {
        'required_per_locale': len(required_keys()), 'vi': len(vi), 'en': len(en),
        'draft_en': sum(row.get('review_status') != 'approved' for row in en),
        'similarity_queue': similarities,
    }
    if not args.catalog_only:
        with sqlite3.connect(f'file:{DB_PATH.as_posix()}?mode=ro', uri=True) as db:
            db.row_factory = sqlite3.Row
            version = db.execute('PRAGMA user_version').fetchone()[0]
            integrity = db.execute('PRAGMA integrity_check').fetchone()[0]
            ca_dao = db.execute('SELECT COUNT(*) FROM cadao').fetchone()[0]
            rows = [dict(row) for row in db.execute('SELECT * FROM numerology_knowledge')]
        report.update(version=version, integrity=integrity, ca_dao=ca_dao)
        if version != DATABASE_VERSION:
            errors.append(f'Expected user_version {DATABASE_VERSION}, found {version}')
        if integrity != 'ok' or ca_dao != 16521:
            errors.append('SQLite integrity or ca dao row count changed')
        expected = {(locale, key(row)): row for locale, entries in [('vi', vi), ('en', en)] for row in entries}
        actual = {(row['locale'], key(row)): row for row in rows}
        if set(actual) != set(expected) or len(rows) != len(expected):
            errors.append('Bundled SQLite keys differ from the exact bilingual catalog')
        revisions = {key(row): source_revision(row['title'], row['content']) for row in vi}
        for localized_key, article in expected.items():
            row = actual.get(localized_key, {})
            if any(row.get(field) != article.get(field) for field in ['title', 'content', 'review_status', 'reviewed_by']):
                errors.append(f'Bundled text/approval differs from catalog: {localized_key}')
            if row.get('source_revision') != revisions.get(localized_key[1]):
                errors.append(f'Bundled source revision is stale: {localized_key}')
        manifest = json.loads((ROOT / 'src/data/numerologyKnowledgeManifest.json').read_text(encoding='utf-8'))
        if manifest != {'version': DATABASE_VERSION, 'revisions': dict(sorted(revisions.items()))}:
            errors.append('Runtime manifest differs from the source catalog')
    report['errors'] = errors
    print(json.dumps(report, ensure_ascii=False))
    if args.report:
        from pathlib import Path
        Path(args.report).write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    if errors:
        raise SystemExit(f'Catalog audit failed with {len(errors)} error(s).')


if __name__ == '__main__':
    main()
