"""Audit the bundled SQLite numerology knowledge against its 24-card contract."""

from __future__ import annotations

import json
import sqlite3
import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATABASE_PATH = PROJECT_ROOT / "assets" / "cadao.db"
CONTRACT_PATH = PROJECT_ROOT / "src" / "data" / "numerologyKnowledgeContract.vi.json"
EXPECTED_LEGACY_ROWS = 212


def main() -> None:
    contract = json.loads(CONTRACT_PATH.read_text(encoding="utf-8"))
    connection = sqlite3.connect(f"file:{DATABASE_PATH.as_posix()}?mode=ro", uri=True)
    try:
        version = connection.execute("PRAGMA user_version").fetchone()[0]
        integrity = connection.execute("PRAGMA integrity_check").fetchone()[0]
        rows = connection.execute(
            "SELECT indicator_key, number_value, title, content, source "
            "FROM numerology_knowledge"
        ).fetchall()
    finally:
        connection.close()

    buckets: dict[tuple[str, str], list[tuple]] = {}
    for row in rows:
        buckets.setdefault((row[0], row[1]), []).append(row)

    required_pairs: set[tuple[str, str]] = set()
    missing: list[str] = []
    duplicate: list[str] = []
    invalid: list[str] = []
    report: list[tuple[str, int, int, list[str]]] = []

    for indicator in contract["indicators"]:
        indicator_key = indicator["key"]
        required_values = [str(value) for value in indicator["requiredValues"]]
        indicator_missing: list[str] = []
        found = 0
        for number_value in required_values:
            pair = (indicator_key, number_value)
            required_pairs.add(pair)
            matches = buckets.get(pair, [])
            if not matches:
                missing.append(f"{indicator_key}|{number_value}")
                indicator_missing.append(number_value)
                continue
            found += 1
            if len(matches) > 1:
                duplicate.append(f"{indicator_key}|{number_value} ({len(matches)})")
            for row in matches:
                if not str(row[2] or "").strip() or len(str(row[3] or "").strip()) < 100:
                    invalid.append(f"{indicator_key}|{number_value}")
        report.append((indicator_key, found, len(required_values), indicator_missing))

    stored_pairs = set(buckets)
    extra = sorted(stored_pairs - required_pairs)
    legacy_count = sum(1 for row in rows if row[4] == "supabase-clone")

    print("\nNUMEROLOGY SQLITE COVERAGE")
    print(
        f"DB version: {version} | Rows: {len(rows)} | Legacy clone: {legacy_count} "
        f"| Required: {len(required_pairs)}"
    )
    for indicator_key, found, required, indicator_missing in report:
        suffix = f" | thiếu: {', '.join(indicator_missing)}" if indicator_missing else ""
        print(f"{indicator_key:<25} {found:>3}/{required:<3}{suffix}")
    print(
        f"\nMissing: {len(missing)} | Duplicate: {len(duplicate)} "
        f"| Invalid: {len(invalid)} | Extra: {len(extra)}"
    )

    failures: list[str] = []
    if version < 3:
        failures.append(f"DB version {version} < 3")
    if integrity != "ok":
        failures.append(f"SQLite integrity_check: {integrity}")
    if legacy_count != EXPECTED_LEGACY_ROWS:
        failures.append(f"Legacy clone {legacy_count} != {EXPECTED_LEGACY_ROWS}")
    if missing:
        failures.append("Missing:\n- " + "\n- ".join(missing))
    if duplicate:
        failures.append("Duplicate:\n- " + "\n- ".join(duplicate))
    if invalid:
        failures.append("Invalid:\n- " + "\n- ".join(invalid))
    if extra:
        print("Extra (warning):\n- " + "\n- ".join(f"{key}|{value}" for key, value in extra))
    if failures:
        print("\n".join(failures), file=sys.stderr)
        raise SystemExit(1)


if __name__ == "__main__":
    main()
