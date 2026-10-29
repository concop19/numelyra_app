from __future__ import annotations

import re
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SOURCE_SUFFIXES = {".js", ".jsx", ".ts", ".tsx"}
LEGACY_TERMS = (
    re.compile(r"linh\s+miêu", re.IGNORECASE),
    re.compile(r"spirit\s+cat", re.IGNORECASE),
)


def source_files() -> list[Path]:
    files = [PROJECT_ROOT / "App.tsx"]
    files.extend(
        path
        for path in (PROJECT_ROOT / "src").rglob("*")
        if path.is_file() and path.suffix.lower() in SOURCE_SUFFIXES
    )
    return files


def main() -> int:
    violations: list[str] = []

    for path in source_files():
        text = path.read_text(encoding="utf-8")
        relative_path = path.relative_to(PROJECT_ROOT)

        for line_number, line in enumerate(text.splitlines(), start=1):
            if any(pattern.search(line) for pattern in LEGACY_TERMS):
                violations.append(f"{relative_path}:{line_number}: legacy mascot name")

        if relative_path == Path("App.tsx") and "🐱" in text:
            violations.append("App.tsx: cat emoji cannot represent the Flame mascot")

    if violations:
        print("Brand terminology audit failed:")
        for violation in violations:
            print(f"- {violation}")
        return 1

    print("Brand terminology audit passed: Flame mascot naming is consistent.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
