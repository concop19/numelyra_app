"""Shared, offline editorial validation for the bundled bilingual catalog."""

from __future__ import annotations

import hashlib
import json
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTRACT_PATH = ROOT / 'src/data/numerologyKnowledgeContract.vi.json'
VI_PATH = ROOT / 'src/data/numerologyKnowledge.vi.json'
VI_EDITS_PATH = ROOT / 'src/data/numerologyKnowledge.vi.overrides.json'
EN_PATH = ROOT / 'src/data/numerologyKnowledge.en.overrides.json'
SIMILARITY_REVIEWS_PATH = ROOT / 'src/data/numerologyKnowledge.similarityReviews.json'
DATABASE_VERSION = 5
VIETNAMESE = re.compile(r'[ÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠƯàáâãèéêìíòóôõùúăđĩũơưẠ-ỹ]')


def source_revision(title: str, content: str) -> str:
    return hashlib.sha256(f'{title}\n{content}'.encode('utf-8')).hexdigest()[:16]


def key(row: dict) -> str:
    return f"{row['indicator_key']}|{row['number_value']}"


def required_keys() -> set[str]:
    contract = json.loads(CONTRACT_PATH.read_text(encoding='utf-8'))
    return {f"{entry['key']}|{value}" for entry in contract['indicators'] for value in entry['requiredValues']}


def load_rows(path: Path) -> list[dict]:
    return json.loads(path.read_text(encoding='utf-8'))['rows']


def vietnamese_rows() -> list[dict]:
    rows = load_rows(VI_PATH)
    edits = {key(row): row for row in load_rows(VI_EDITS_PATH)} if VI_EDITS_PATH.exists() else {}
    return [{**row, **edits.get(key(row), {})} for row in rows]


def normalize(text: str) -> str:
    return ' '.join(re.findall(r'\w+', text.lower(), re.UNICODE))


def sections(content: str) -> list[tuple[str, str]]:
    result: list[tuple[str, str]] = []
    heading, lines = '', []
    for line in content.splitlines():
        if re.match(r'^#{1,6}\s+', line):
            if '\n'.join(lines).strip():
                result.append((heading, '\n'.join(lines).strip()))
            heading, lines = line.lstrip('# ').strip(), []
        else:
            lines.append(line)
    if '\n'.join(lines).strip():
        result.append((heading, '\n'.join(lines).strip()))
    return result


def shingles(content: str) -> set[tuple[str, ...]]:
    words = normalize(content).split()
    return {tuple(words[i:i + 5]) for i in range(max(1, len(words) - 4))}


def markdown_structure(content: str) -> tuple[int, int, int]:
    """Headings, list items, and FAQ questions must survive the translation."""
    return (
        len(re.findall(r'^#{1,6}\s+', content, re.MULTILINE)),
        len(re.findall(r'^\s*(?:[-*•]|\d+[.)])\s+', content, re.MULTILINE)),
        len(re.findall(r'\*\*Q:', content)),
    )


def quality_findings(rows: list[dict], locale: str) -> tuple[list[str], list[dict]]:
    """Block exact cross-indicator copies; queue 5-token Jaccard similarity >85%."""
    errors, similarities = [], []
    bodies: dict[str, list[str]] = defaultdict(list)
    for row in rows:
        for _, body in sections(row['content']):
            normalized = normalize(body)
            if normalized:
                bodies[normalized].append(key(row))
        bodies[normalize(row['content'])].append(key(row))
    duplicates = set()
    for owners in bodies.values():
        distinct = sorted(set(owners))
        if len({owner.split('|')[0] for owner in distinct}) > 1:
            duplicates.add(tuple(distinct))
    for owners in sorted(duplicates):
        errors.append(f'{locale}: identical article/section across indicators: {", ".join(owners)}')
    ordered = sorted(rows, key=key)
    fingerprints = [shingles(row['content']) for row in ordered]
    for i, left in enumerate(ordered):
        for j in range(i + 1, len(ordered)):
            right = ordered[j]
            a, b = fingerprints[i], fingerprints[j]
            if not a or not b or min(len(a), len(b)) / max(len(a), len(b)) <= .85:
                continue
            score = len(a & b) / len(a | b)
            if score <= .85:
                continue
            revisions = [source_revision(row['title'], row['content']) for row in (left, right)]
            review_id = '|'.join([locale, key(left), key(right), *revisions])
            similarities.append({'id': review_id, 'locale': locale, 'left': key(left), 'right': key(right), 'score': round(score, 4)})
    return errors, similarities


def validate_catalog(vi: list[dict], en: list[dict]) -> tuple[list[str], list[dict]]:
    errors, similarities = [], []
    required = required_keys()
    vi_by_key = {key(row): row for row in vi}
    for locale, rows in [('vi', vi), ('en', en)]:
        actual = {key(row) for row in rows}
        if len(actual) != len(rows):
            errors.append(f'{locale}: duplicate catalog keys')
        for label, values in [('missing', required - actual), ('unexpected', actual - required)]:
            if values:
                errors.append(f'{locale}: {label} {len(values)} keys: {", ".join(sorted(values)[:8])}')
        for row in rows:
            row_key = key(row)
            if not row.get('title', '').strip() or len(row.get('content', '').strip()) < 100:
                errors.append(f'{locale}:{row_key}: empty or truncated content')
            if '\ufffd' in row.get('title', '') + row.get('content', ''):
                errors.append(f'{locale}:{row_key}: invalid Unicode replacement character')
            if row.get('review_status') != 'approved' or not row.get('reviewed_by'):
                errors.append(f'{locale}:{row_key}: editorial approval required')
            if locale == 'en':
                source = vi_by_key.get(row_key)
                if source and row.get('source_revision') != source_revision(source['title'], source['content']):
                    errors.append(f'en:{row_key}: stale source_revision')
                if VIETNAMESE.search(row.get('title', '') + row.get('content', '')):
                    errors.append(f'en:{row_key}: untranslated Vietnamese text')
                if source and len(sections(row['content'])) != len(sections(source['content'])):
                    errors.append(f'en:{row_key}: source section count differs')
                if source and markdown_structure(row['content']) != markdown_structure(source['content']):
                    errors.append(f'en:{row_key}: source headings, list items, or FAQ count differs')
        duplicate_errors, similar = quality_findings(rows, locale)
        errors.extend(duplicate_errors)
        similarities.extend(similar)
    reviews = load_rows(SIMILARITY_REVIEWS_PATH) if SIMILARITY_REVIEWS_PATH.exists() else []
    reviewed = {row['id'] for row in reviews if row.get('review_status') == 'approved' and row.get('reviewed_by') and row.get('rationale')}
    errors.extend(f"Similarity review required: {item['id']} ({item['score']:.1%})" for item in similarities if item['id'] not in reviewed)
    return errors, similarities
