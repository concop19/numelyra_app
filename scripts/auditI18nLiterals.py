"""Report likely untranslated UI literals.

The default mode writes a readable report for incremental cleanup. Release CI
uses --strict so any likely user-facing Vietnamese literal blocks shipping.
Data catalogs, tests, comments, ca dao, and proper-name sources are excluded.
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOTS = [ROOT / "src" / "components", ROOT / "src" / "screens", ROOT / "src" / "features"]
VIETNAMESE = re.compile(r"[ÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠƯàáâãèéêìíòóôõùúăđĩũơưẠ-ỹ]")
USER_FACING = re.compile(
    r"(<Text\b[^>]*>[^<{]*|placeholder\s*=|accessibilityLabel\s*=|Alert\.alert\(|\balert\(|text\s*:)"
)

EXCLUDED_PARTS = {
    "__tests__", "test.ts", "test.tsx", "data", "i18n", "assets", "dailyInsightThirtyDayAudit",
}


def should_scan(path: Path) -> bool:
    value = path.as_posix()
    return path.suffix in {".ts", ".tsx"} and not any(part in value for part in EXCLUDED_PARTS)


def suspicious(path: Path) -> list[tuple[int, str]]:
    findings: list[tuple[int, str]] = []
    for number, raw in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        line = raw.strip()
        if not line or line.startswith(("//", "/*", "*", "import ")):
            continue
        if not VIETNAMESE.search(line) or not USER_FACING.search(line):
            continue
        if any(marker in line for marker in (
            "l(", "copy(", "t('", 't("', "locale ===", "en ?", "english ?", "lang ===",
        )):
            continue
        if "Lý Thuần Phong" in line:  # historical proper name, intentionally unchanged
            continue
        findings.append((number, line[:220]))
    return findings


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser()
    parser.add_argument("--strict", action="store_true")
    args = parser.parse_args()
    findings: list[tuple[Path, int, str]] = []
    for source_root in SOURCE_ROOTS:
        for path in source_root.rglob("*"):
            if should_scan(path):
                findings.extend((path, line, text) for line, text in suspicious(path))

    print(f"i18n literal audit: {len(findings)} likely untranslated UI literals")
    for path, line, text in findings[:100]:
        print(f"{path.relative_to(ROOT)}:{line}: {text}")
    if len(findings) > 100:
        print(f"... {len(findings) - 100} more")
    if args.strict and findings:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
