"""Validate bilingual coverage and release readiness of the bundled database."""

from __future__ import annotations

import argparse
import json
import sqlite3
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / "assets" / "cadao.db"
CONTRACT_PATH = ROOT / "src" / "data" / "numerologyKnowledgeContract.vi.json"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--require-approved", action="store_true")
    args = parser.parse_args()
    contract = json.loads(CONTRACT_PATH.read_text(encoding="utf-8"))
    required = {
        (entry["key"], str(value))
        for entry in contract["indicators"]
        for value in entry["requiredValues"]
    }
    db = sqlite3.connect(f"file:{DB_PATH.as_posix()}?mode=ro", uri=True)
    try:
        version = db.execute("PRAGMA user_version").fetchone()[0]
        integrity = db.execute("PRAGMA integrity_check").fetchone()[0]
        rows = db.execute(
            "SELECT indicator_key, number_value, locale, title, content, review_status FROM numerology_knowledge"
        ).fetchall()
        ca_dao_count = db.execute("SELECT COUNT(*) FROM cadao").fetchone()[0]
        duplicates = db.execute("""
            SELECT indicator_key, number_value, locale, COUNT(*)
            FROM numerology_knowledge
            GROUP BY indicator_key, number_value, locale
            HAVING COUNT(*) > 1
        """).fetchall()
    finally:
        db.close()

    errors: list[str] = []
    if version != 4:
        errors.append(f"Expected user_version 4, found {version}")
    if integrity != "ok":
        errors.append(f"integrity_check: {integrity}")
    if ca_dao_count != 16521:
        errors.append(f"Expected 16521 ca dao rows, found {ca_dao_count}")
    if duplicates:
        errors.append(f"Duplicate locale keys: {duplicates[:10]}")
    by_locale = {locale: [row for row in rows if row[2] == locale] for locale in ("vi", "en")}
    vi_keys = {(row[0], row[1]) for row in by_locale["vi"]}
    en_keys = {(row[0], row[1]) for row in by_locale["en"]}
    for locale, locale_rows in by_locale.items():
        keys = {(row[0], row[1]) for row in locale_rows}
        missing = sorted(required - keys)
        invalid = [(row[0], row[1]) for row in locale_rows if not row[3].strip() or len(row[4].strip()) < 100]
        if len(locale_rows) != 320:
            errors.append(f"{locale}: expected 320 rows, found {len(locale_rows)}")
        if len({row[0] for row in locale_rows}) != 24:
            errors.append(f"{locale}: expected 24 indicators")
        if missing:
            errors.append(f"{locale}: missing {missing[:10]} (total={len(missing)})")
        if invalid:
            errors.append(f"{locale}: invalid {invalid[:10]} (total={len(invalid)})")
    if vi_keys != en_keys:
        errors.append("Vietnamese and English key sets differ")
    draft_count = sum(1 for row in by_locale["en"] if row[5] != "approved")
    if args.require_approved and draft_count:
        errors.append(f"English editorial approval pending for {draft_count} rows")

    report = {
        "version": version,
        "integrity": integrity,
        "vi": len(by_locale["vi"]),
        "en": len(by_locale["en"]),
        "required_per_locale": len(required),
        "indicators_per_locale": {locale: len({row[0] for row in locale_rows}) for locale, locale_rows in by_locale.items()},
        "ca_dao": ca_dao_count,
        "draft_en": draft_count,
    }
    print(json.dumps(report, ensure_ascii=False))
    if errors:
        raise SystemExit("\n".join(errors))


if __name__ == "__main__":
    main()
