"""Build the bundled v4 bilingual numerology knowledge database.

Vietnamese rows remain the source of truth. English rows are generated as
complete, deterministic editorial drafts and carry review_status=draft until a
reviewer supplies an approved override in numerologyKnowledge.en.overrides.json.
The mobile runtime never calls a translation service.
"""

from __future__ import annotations

import hashlib
import json
import sqlite3
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / "assets" / "cadao.db"
GLOSSARY_PATH = ROOT / "src" / "data" / "numerologyEnglishGlossary.json"
OVERRIDES_PATH = ROOT / "src" / "data" / "numerologyKnowledge.en.overrides.json"
DATABASE_VERSION = 4


ARCHETYPES = {
    "0": ("an unformed or unavailable value", "honest acknowledgement of missing input", "forcing a meaning onto incomplete data", "verify the source data before interpreting this result"),
    "1": ("initiative, independence, and the courage to begin", "decisive leadership", "impatience or excessive self-reliance", "lead clearly while remaining receptive to feedback"),
    "2": ("cooperation, sensitivity, and patient connection", "diplomacy and emotional awareness", "indecision or over-accommodation", "protect your boundaries while preserving collaboration"),
    "3": ("expression, creativity, and social vitality", "imaginative communication", "scattered attention or unspoken feelings", "turn inspiration into one concrete form"),
    "4": ("structure, discipline, and dependable progress", "practical organization", "rigidity or fear of change", "build steadily while leaving room to adapt"),
    "5": ("freedom, movement, and learning through experience", "adaptability and curiosity", "restlessness or impulsive choices", "choose change deliberately rather than reactively"),
    "6": ("care, responsibility, and the creation of harmony", "loyal support and stewardship", "over-responsibility or perfectionism", "care for others without abandoning your own needs"),
    "7": ("analysis, contemplation, and inner knowledge", "discernment and depth", "isolation or excessive skepticism", "balance reflection with direct participation"),
    "8": ("achievement, authority, and material stewardship", "strategic execution", "control, workaholism, or status anxiety", "use influence ethically and measure success broadly"),
    "9": ("compassion, completion, and a broad human perspective", "generosity and emotional wisdom", "martyrdom or difficulty letting go", "serve with boundaries and release completed cycles"),
    "10": ("renewed initiative supported by accumulated experience", "resilient leadership", "repeating old cycles unconsciously", "begin again with a clearer purpose"),
    "11": ("heightened intuition, inspiration, and perceptive sensitivity", "visionary insight", "nervous intensity or impractical idealism", "ground intuition in routines and verifiable action"),
    "22": ("the Master Builder pattern: vision translated into durable form", "large-scale planning and service", "pressure, overwork, or fear of a large calling", "divide the vision into responsible, measurable stages"),
    "22/4": ("the Master Builder pattern: vision translated into durable form", "large-scale planning and service", "pressure, overwork, or fear of a large calling", "divide the vision into responsible, measurable stages"),
    "33": ("the Master Teacher pattern: compassionate service and healing responsibility", "uplifting guidance and care", "self-sacrifice or unrealistic responsibility", "serve within healthy limits and accept support"),
    "33/6": ("the Master Teacher pattern: compassionate service and healing responsibility", "uplifting guidance and care", "self-sacrifice or unrealistic responsibility", "serve within healthy limits and accept support"),
}

INDICATOR_CONTEXT = {
    "walksOfLife": "the long-term direction, natural approach, and recurring lessons of a life",
    "mission": "the contribution and form of expression a person is called to develop",
    "soul": "private motivation, emotional needs, and what feels meaningful within",
    "personality": "the style and first impression shown to other people",
    "dateOfBirth": "an inborn talent associated with the day of birth",
    "mature": "qualities that become more integrated and visible with maturity",
    "balance": "the instinctive response used to regain equilibrium under pressure",
    "rationalThinking": "the way information is organized and decisions are approached",
    "subconsciousPower": "the range of instinctive resources available during difficulty",
    "passion": "a repeated energy in the name that attracts attention and enthusiasm",
    "attitude": "the immediate approach to new situations and everyday experience",
    "karmicDebts": "a demanding lesson traditionally associated with disciplined growth",
    "missingNumbers": "a quality underrepresented in the name and developed through practice",
    "bridgeLifeMission": "the quality that helps reconcile lived direction with purpose",
    "bridgeSoulPersonality": "the quality that connects private needs with outward expression",
    "bridgeMaturityPassion": "the quality that connects enthusiasm with mature achievement",
    "yearIndividual": "the broad developmental rhythm of the current personal year",
    "monthIndividual": "the short-term priorities and pace of the current personal month",
    "dayIndividual": "the tone and most constructive attitude for the current personal day",
    "way": "the theme of a major Pinnacle phase of development",
    "challenges": "a recurring lesson that develops resilience across a life phase",
    "arrows": "a three-number pattern in the birth chart",
    "nameChart": "the frequency of a number in the name chart",
    "birthChart": "the frequency of a digit in the birth-date chart",
}

STATE_TEXT = {
    "missing": ("is absent", "awareness creates a deliberate path for development", "the quality may not feel automatic", "practice it through one small repeatable behavior"),
    "baseline": ("appears at a foundational level", "the quality is accessible without dominating the chart", "it can be overlooked when stronger patterns take over", "use it consciously when the situation calls for it"),
    "highlighted": ("is clearly emphasized", "the quality can become a reliable resource", "overuse may narrow the range of responses", "pair the strength with its balancing quality"),
    "amplified": ("is strongly repeated", "the quality carries unusual intensity and availability", "intensity can become excess or rigidity", "channel it into structured, proportionate action"),
    "strong": ("is complete", "the line forms a concentrated and readily available pattern", "a strength can become automatic or excessive", "use the pattern deliberately and remain flexible"),
    "partial": ("is partially present", "the present numbers provide a practical foundation", "the pattern may operate unevenly", "develop the missing link through consistent practice"),
    "empty": ("is empty", "recognition makes conscious development possible", "the theme may require sustained attention", "treat it as a practice area rather than a fixed weakness"),
}


def source_revision(title: str, content: str) -> str:
    return hashlib.sha256(f"{title}\n{content}".encode("utf-8")).hexdigest()[:16]


def english_reading(indicator: str, value: str, glossary: dict[str, str]) -> tuple[str, str]:
    name = glossary.get(indicator, indicator)
    if ":" in value:
        subject, state = value.rsplit(":", 1)
        status, strength, challenge, advice = STATE_TEXT.get(state, STATE_TEXT["baseline"])
        overview = f"In the {name}, {subject} {status}. This describes {INDICATOR_CONTEXT.get(indicator, 'a numerology pattern')} rather than a fixed prediction."
    elif indicator == "karmicDebts" and value != "none":
        debt = {
            "13/4": ("discipline, patient work, and respect for process", "reliable effort", "shortcuts or avoidance", "build progress through consistent routines"),
            "14/5": ("freedom governed by moderation and responsibility", "adaptability", "excess or instability", "create boundaries that protect meaningful freedom"),
            "16/7": ("humility, self-knowledge, and release of false certainty", "spiritual insight", "pride or withdrawal", "let experience refine your beliefs"),
            "19/1": ("independence balanced with cooperation and service", "self-directed leadership", "isolation or misuse of power", "lead without refusing interdependence"),
        }.get(value, ARCHETYPES["4"])
        overview, strength, challenge, advice = debt
        overview = f"{name} {value} centers on {overview}. It is a reflective growth theme, not a sentence or prediction."
    elif indicator == "karmicDebts" and value == "none":
        overview = "No core karmic-debt number (13/4, 14/5, 16/7, or 19/1) is present in the values checked for this profile."
        strength, challenge, advice = "attention can remain on the patterns that are actually present", "absence of a debt number does not mean absence of life lessons", "review Karmic Lessons and the Four Challenges for more relevant growth themes"
    elif indicator == "missingNumbers" and value == "none":
        overview = "All nine number groups appear in the name chart, so no Karmic Lesson is recorded as missing."
        strength, challenge, advice = "the name offers a broad range of expressive qualities", "complete coverage does not guarantee balanced frequency", "review the Name Chart for repeated or amplified numbers"
    else:
        base_value = value.split("/")[0]
        theme, strength, challenge, advice = ARCHETYPES.get(value, ARCHETYPES.get(base_value, ARCHETYPES["1"]))
        overview = f"{name} {value} applies {theme} to {INDICATOR_CONTEXT.get(indicator, 'this numerology result')}. Use it as a pattern for reflection, not as a fixed prediction."

    title = f"{name} {value}"
    content = "\n".join([
        "# OVERVIEW", overview, "", "# STRENGTHS", f"- {strength.capitalize()}.", "",
        "# CHALLENGES", f"- {challenge.capitalize()}.", "", "# GUIDANCE", f"{advice.capitalize()}.",
    ])
    return title, content


def load_overrides() -> dict[str, dict]:
    if not OVERRIDES_PATH.exists():
        return {}
    payload = json.loads(OVERRIDES_PATH.read_text(encoding="utf-8"))
    return {f"{row['indicator_key']}|{row['number_value']}": row for row in payload.get("rows", [])}


def main() -> None:
    glossary = json.loads(GLOSSARY_PATH.read_text(encoding="utf-8"))["terms"]
    overrides = load_overrides()
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    try:
        columns = {row[1] for row in connection.execute("PRAGMA table_info(numerology_knowledge)")}
        if "locale" in columns:
            vi_rows = connection.execute("SELECT * FROM numerology_knowledge WHERE locale='vi' ORDER BY local_id").fetchall()
        else:
            vi_rows = connection.execute("SELECT * FROM numerology_knowledge ORDER BY local_id").fetchall()

        connection.execute("BEGIN IMMEDIATE")
        connection.execute("DROP TABLE IF EXISTS numerology_knowledge_v4")
        connection.execute("""
          CREATE TABLE numerology_knowledge_v4 (
            local_id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_id TEXT,
            indicator_key TEXT NOT NULL,
            number_value TEXT NOT NULL,
            locale TEXT NOT NULL CHECK(locale IN ('vi','en')),
            indicator_name TEXT,
            title TEXT NOT NULL,
            category TEXT,
            content TEXT NOT NULL,
            keywords_json TEXT,
            source TEXT NOT NULL,
            review_status TEXT NOT NULL DEFAULT 'approved',
            source_revision TEXT,
            created_at TEXT,
            UNIQUE(indicator_key, number_value, locale)
          )
        """)

        insert_sql = """
          INSERT INTO numerology_knowledge_v4 (
            source_id, indicator_key, number_value, locale, indicator_name, title,
            category, content, keywords_json, source, review_status, source_revision, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        approved = 0
        for row in vi_rows:
            revision = source_revision(row["title"], row["content"])
            connection.execute(insert_sql, (
                row["source_id"], row["indicator_key"], row["number_value"], "vi",
                row["indicator_name"], row["title"], row["category"], row["content"],
                row["keywords_json"], row["source"], "approved", revision, row["created_at"],
            ))
            key = f"{row['indicator_key']}|{row['number_value']}"
            override = overrides.get(key)
            if override and override.get("source_revision") == revision and override.get("review_status") == "approved":
                en_title, en_content, status = override["title"], override["content"], "approved"
                approved += 1
            else:
                en_title, en_content = english_reading(row["indicator_key"], row["number_value"], glossary)
                status = "draft"
            connection.execute(insert_sql, (
                row["source_id"], row["indicator_key"], row["number_value"], "en",
                glossary.get(row["indicator_key"], row["indicator_key"]), en_title,
                row["category"], en_content, row["keywords_json"], "local-en",
                status, revision, row["created_at"],
            ))

        connection.execute("DROP TABLE numerology_knowledge")
        connection.execute("ALTER TABLE numerology_knowledge_v4 RENAME TO numerology_knowledge")
        connection.execute("CREATE INDEX numerology_knowledge_indicator_locale_idx ON numerology_knowledge(indicator_key, locale)")
        connection.execute(f"PRAGMA user_version = {DATABASE_VERSION}")
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()

    # Repack into a fresh file so repeated builds do not retain freelist pages
    # or ever-increasing SQLite header counters from the previous bundle.
    packed_path = DB_PATH.with_suffix(".packed.db")
    packed_path.unlink(missing_ok=True)
    pack_connection = sqlite3.connect(DB_PATH)
    try:
        pack_connection.execute("VACUUM INTO ?", (str(packed_path),))
    finally:
        pack_connection.close()
    packed_path.replace(DB_PATH)

    print(json.dumps({"vi": len(vi_rows), "en": len(vi_rows), "approved_en": approved, "version": DATABASE_VERSION}))


if __name__ == "__main__":
    main()
