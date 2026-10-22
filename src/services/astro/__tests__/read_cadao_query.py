"""Execute fixed SELECT queries against the bundled ca dao database in read-only mode."""

from __future__ import annotations

import json
import sqlite3
import sys
from pathlib import Path


def normalize_text(value: str) -> str:
    """Collapse escaped UTF-16 surrogate pairs before binding them to SQLite."""
    return value.encode("utf-16", "surrogatepass").decode("utf-16", "replace")


def main() -> None:
    database_path = Path(sys.argv[1]).resolve()
    database_uri = f"{database_path.as_uri()}?mode=ro&immutable=1"
    query_specs = json.loads(sys.stdin.buffer.read().decode("utf-8"))

    connection = sqlite3.connect(database_uri, uri=True)
    connection.row_factory = sqlite3.Row
    try:
        rows = []
        for spec in query_specs:
            sql = normalize_text(str(spec["sql"]))
            if not sql.lstrip().upper().startswith("SELECT"):
                raise ValueError("Only read-only SELECT statements are allowed")
            parameters = [
                normalize_text(value) if isinstance(value, str) else value
                for value in spec.get("parameters", [])
            ]
            row = connection.execute(sql, parameters).fetchone()
            rows.append(dict(row) if row is not None else None)
        output = json.dumps(rows, ensure_ascii=False).encode("utf-8")
        sys.stdout.buffer.write(output)
    finally:
        connection.close()


if __name__ == "__main__":
    main()
