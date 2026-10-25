"""Package reviewed, source-aligned translations. Never generate reading text."""

from __future__ import annotations

import argparse
import json
import sqlite3
import sys
from contextlib import closing
from pathlib import Path

from numerologyCatalog import (
    DATABASE_VERSION, EN_PATH, ROOT, VI_PATH, key, load_rows,
    required_keys, source_revision, validate_catalog, vietnamese_rows,
)

DB_PATH = ROOT / 'assets/cadao.db'


def export_source() -> None:
    """One-time lossless extraction of the bundled Vietnamese source of truth."""
    if VI_PATH.exists():
        raise SystemExit(f'Refusing to overwrite {VI_PATH}')
    with closing(sqlite3.connect(f'file:{DB_PATH.as_posix()}?mode=ro', uri=True)) as db:
        db.row_factory = sqlite3.Row
        rows = [dict(row) for row in db.execute("SELECT * FROM numerology_knowledge WHERE locale='vi' ORDER BY indicator_key, number_value")]
    required = required_keys()
    rows = [{**row, 'reviewed_by': 'legacy-vi-import'} for row in rows if key(row) in required]
    VI_PATH.write_text(json.dumps({'version': 1, 'locale': 'vi', 'rows': rows}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'exported_vi': len(rows)}))


def build_database(output: Path = DB_PATH) -> None:
    vi, en = vietnamese_rows(), load_rows(EN_PATH)
    errors, similarities = validate_catalog(vi, en)
    if errors:
        raise SystemExit('\n'.join(errors) + '\nDatabase unchanged: all editorial gates must pass before packaging.')
    glossary = json.loads((ROOT / 'src/data/numerologyEnglishGlossary.json').read_text(encoding='utf-8'))['terms']
    english = {key(row): row for row in en}
    staged = output.with_suffix('.staged.db')
    if staged.exists():
        raise SystemExit(f'Staging file already exists: {staged}')
    with closing(sqlite3.connect(f'file:{DB_PATH.as_posix()}?mode=ro', uri=True)) as source:
        with closing(sqlite3.connect(staged)) as db:
            source.backup(db)
            db.execute('DROP TABLE numerology_knowledge')
            db.execute("""CREATE TABLE numerology_knowledge (
                local_id INTEGER PRIMARY KEY AUTOINCREMENT,
                source_id TEXT, indicator_key TEXT NOT NULL, number_value TEXT NOT NULL,
                locale TEXT NOT NULL CHECK(locale IN ('vi','en')), indicator_name TEXT,
                title TEXT NOT NULL, category TEXT, content TEXT NOT NULL, keywords_json TEXT,
                source TEXT NOT NULL, review_status TEXT NOT NULL CHECK(review_status='approved'),
                source_revision TEXT NOT NULL, reviewed_by TEXT NOT NULL, created_at TEXT,
                UNIQUE(indicator_key, number_value, locale))""")
            for row in sorted(vi, key=key):
                revision = source_revision(row['title'], row['content'])
                for locale, article in [('vi', row), ('en', english[key(row)])]:
                    db.execute("""INSERT INTO numerology_knowledge (
                        source_id, indicator_key, number_value, locale, indicator_name, title,
                        category, content, keywords_json, source, review_status, source_revision,
                        reviewed_by, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)""", (
                        row.get('source_id'), row['indicator_key'], row['number_value'], locale,
                        row.get('indicator_name') if locale == 'vi' else glossary[row['indicator_key']],
                        article['title'], row.get('category'), article['content'],
                        row.get('keywords_json'), row.get('source', 'local-editorial') if locale == 'vi' else 'editorial-translation',
                        'approved', revision, article['reviewed_by'], row.get('created_at'),
                    ))
            db.execute('CREATE INDEX numerology_knowledge_indicator_locale_idx ON numerology_knowledge(indicator_key, locale)')
            db.execute(f'PRAGMA user_version = {DATABASE_VERSION}')
            db.commit()
            db.execute('VACUUM')
            if db.execute('PRAGMA integrity_check').fetchone()[0] != 'ok':
                raise RuntimeError('Generated SQLite integrity check failed')
    staged.replace(output)
    manifest_path = ROOT / 'src/data/numerologyKnowledgeManifest.json'
    manifest = {'version': DATABASE_VERSION, 'revisions': {key(row): source_revision(row['title'], row['content']) for row in sorted(vi, key=key)}}
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'version': DATABASE_VERSION, 'vi': len(vi), 'en': len(en), 'approved_en': len(en), 'similarity_reviews': len(similarities)}))


def main() -> None:
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    parser = argparse.ArgumentParser()
    parser.add_argument('--export-source', action='store_true')
    args = parser.parse_args()
    export_source() if args.export_source else build_database()


if __name__ == '__main__':
    main()
