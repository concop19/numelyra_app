"""Assemble independently reviewed translation batches; never change approval status."""

from __future__ import annotations

import json
from numerologyCatalog import EN_PATH, ROOT, key, validate_catalog, vietnamese_rows


def main() -> None:
    paths = sorted((ROOT / 'src/data/numerologyTranslations').glob('*.en.json'))
    rows = [row for path in paths for row in json.loads(path.read_text(encoding='utf-8'))['rows']]
    errors, _ = validate_catalog(vietnamese_rows(), rows)
    if errors:
        raise SystemExit('\n'.join(errors))
    EN_PATH.write_text(json.dumps({'version': 2, 'locale': 'en', 'rows': sorted(rows, key=key)}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'batches': len(paths), 'reviewed_translations': len(rows)}))


if __name__ == '__main__':
    main()
