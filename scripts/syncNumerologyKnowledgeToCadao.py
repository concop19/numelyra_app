"""Clone Supabase numerology knowledge into the bundled cadao.db asset.

This is a build-time data migration only. The mobile runtime reads SQLite and
does not contact Supabase for numerology interpretations.
"""

from __future__ import annotations

import json
import sqlite3
import subprocess
import urllib.parse
import urllib.request
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATABASE_PATH = PROJECT_ROOT / "assets" / "cadao.db"
CONTRACT_PATH = PROJECT_ROOT / "src" / "data" / "numerologyKnowledgeContract.vi.json"
SUPPLEMENT_SCRIPT = PROJECT_ROOT / "scripts" / "seedNumerologyKnowledge.js"
EXPECTED_LEGACY_ROWS = 212
DATABASE_VERSION = 3


def read_env() -> dict[str, str]:
    values: dict[str, str] = {}
    env_path = PROJECT_ROOT / ".env"
    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip("'\"")
    return values


def fetch_legacy_rows() -> list[dict]:
    env = read_env()
    base_url = env.get("EXPO_PUBLIC_SUPABASE_URL", "")
    public_key = env.get("EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY") or env.get(
        "EXPO_PUBLIC_SUPABASE_ANON_KEY", ""
    )
    if not base_url or not public_key:
        raise RuntimeError("Missing Supabase URL or public key in .env")

    query = urllib.parse.urlencode({"select": "*", "limit": "2000"})
    request = urllib.request.Request(
        f"{base_url}/rest/v1/numerology_knowledge?{query}",
        headers={"apikey": public_key, "Authorization": f"Bearer {public_key}"},
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        rows = json.loads(response.read().decode("utf-8"))

    if not isinstance(rows, list) or len(rows) != EXPECTED_LEGACY_ROWS:
        raise RuntimeError(
            f"Expected {EXPECTED_LEGACY_ROWS} legacy rows, received "
            f"{len(rows) if isinstance(rows, list) else 'invalid payload'}"
        )
    return rows


def build_supplement_rows(legacy_rows: list[dict]) -> list[dict]:
    result = subprocess.run(
        ["node", str(SUPPLEMENT_SCRIPT), "--json"],
        cwd=PROJECT_ROOT,
        check=True,
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    rows: list[dict] = json.loads(result.stdout)

    legacy_22 = next(
        (
            row
            for row in legacy_rows
            if row.get("indicator_key") == "walksOfLife"
            and row.get("number_value") == "22/4"
        ),
        None,
    )
    if legacy_22 is None:
        raise RuntimeError("Legacy walksOfLife|22/4 row is missing")

    rows.append(
        {
            "indicator_key": "walksOfLife",
            "number_value": "22",
            "indicator_name": legacy_22.get("indicator_name"),
            "title": legacy_22.get("title"),
            "category": legacy_22.get("category"),
            "content": legacy_22.get("content"),
            "keywords": legacy_22.get("keywords"),
        }
    )
    return rows


def json_text(value: object) -> str | None:
    if value is None:
        return None
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def insert_row(
    connection: sqlite3.Connection,
    row: dict,
    source: str,
    source_id: object = None,
) -> None:
    connection.execute(
        """
        INSERT INTO numerology_knowledge (
          source_id, indicator_key, number_value, indicator_name,
          title, category, content, keywords_json, source, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            None if source_id is None else str(source_id),
            row.get("indicator_key"),
            str(row.get("number_value", "")),
            row.get("indicator_name"),
            row.get("title"),
            row.get("category"),
            row.get("content"),
            json_text(row.get("keywords")),
            source,
            row.get("created_at"),
        ),
    )


def validate_database(
    connection: sqlite3.Connection,
    legacy_rows: list[dict],
) -> dict[str, int]:
    contract = json.loads(CONTRACT_PATH.read_text(encoding="utf-8"))
    required_pairs = {
        (indicator["key"], str(number_value))
        for indicator in contract["indicators"]
        for number_value in indicator["requiredValues"]
    }
    stored_rows = connection.execute(
        "SELECT indicator_key, number_value, title, content, source "
        "FROM numerology_knowledge"
    ).fetchall()
    stored_pairs = {(row[0], row[1]) for row in stored_rows}
    missing = sorted(required_pairs - stored_pairs)
    invalid = [
        (row[0], row[1])
        for row in stored_rows
        if not str(row[2] or "").strip() or len(str(row[3] or "").strip()) < 100
    ]
    duplicate_count = connection.execute(
        """
        SELECT COUNT(*) FROM (
          SELECT indicator_key, number_value
          FROM numerology_knowledge
          GROUP BY indicator_key, number_value
          HAVING COUNT(*) > 1
        )
        """
    ).fetchone()[0]
    legacy_count = connection.execute(
        "SELECT COUNT(*) FROM numerology_knowledge WHERE source = 'supabase-clone'"
    ).fetchone()[0]

    stored_legacy = {
        row[0]: row[1:]
        for row in connection.execute(
            """
            SELECT source_id, indicator_key, number_value, indicator_name, title,
                   category, content, keywords_json, created_at
            FROM numerology_knowledge
            WHERE source = 'supabase-clone'
            """
        ).fetchall()
    }
    clone_mismatches: list[str] = []
    for source_row in legacy_rows:
        source_id = str(source_row.get("id"))
        stored = stored_legacy.get(source_id)
        expected = (
            source_row.get("indicator_key"),
            str(source_row.get("number_value", "")),
            source_row.get("indicator_name"),
            source_row.get("title"),
            source_row.get("category"),
            source_row.get("content"),
            json_text(source_row.get("keywords")),
            source_row.get("created_at"),
        )
        if stored != expected:
            clone_mismatches.append(source_id)

    if legacy_count != EXPECTED_LEGACY_ROWS:
        raise RuntimeError(f"Legacy clone mismatch: {legacy_count}")
    if missing:
        raise RuntimeError(f"Missing required pairs: {missing[:10]} (total={len(missing)})")
    if invalid:
        raise RuntimeError(f"Invalid rows: {invalid[:10]} (total={len(invalid)})")
    if duplicate_count:
        raise RuntimeError(f"Duplicate key/value pairs: {duplicate_count}")
    if clone_mismatches:
        raise RuntimeError(
            f"Legacy clone field mismatch: {clone_mismatches[:10]} "
            f"(total={len(clone_mismatches)})"
        )

    return {
        "legacy": legacy_count,
        "required": len(required_pairs),
        "total": len(stored_rows),
        "extra": len(stored_pairs - required_pairs),
    }


def main() -> None:
    legacy_rows = fetch_legacy_rows()
    supplement_rows = build_supplement_rows(legacy_rows)

    connection = sqlite3.connect(DATABASE_PATH)
    try:
        connection.execute("BEGIN IMMEDIATE")
        connection.execute("DROP TABLE IF EXISTS numerology_knowledge")
        connection.execute(
            """
            CREATE TABLE numerology_knowledge (
              local_id INTEGER PRIMARY KEY AUTOINCREMENT,
              source_id TEXT,
              indicator_key TEXT NOT NULL,
              number_value TEXT NOT NULL,
              indicator_name TEXT,
              title TEXT NOT NULL,
              category TEXT,
              content TEXT NOT NULL,
              keywords_json TEXT,
              source TEXT NOT NULL,
              created_at TEXT,
              UNIQUE (indicator_key, number_value)
            )
            """
        )
        connection.execute(
            "CREATE INDEX numerology_knowledge_indicator_idx "
            "ON numerology_knowledge (indicator_key)"
        )

        for row in legacy_rows:
            insert_row(connection, row, "supabase-clone", row.get("id"))
        for row in supplement_rows:
            insert_row(connection, row, "local-supplement")

        stats = validate_database(connection, legacy_rows)
        connection.execute(f"PRAGMA user_version = {DATABASE_VERSION}")
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()

    print(json.dumps(stats, ensure_ascii=False))


if __name__ == "__main__":
    main()
