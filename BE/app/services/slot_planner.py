"""Turns a quiz blueprint into exact slots: (sub_subject, topic, subtopic, difficulty, count).

All rounding uses the largest-remainder method, so every level adds up to
exactly the requested total — no quiz ever ends up with 24 or 26 questions
because of rounding, and each difficulty-mix group's easy/medium/hard totals
match its percentages as closely as integers allow.
"""
import math
from typing import Any, Dict, List, Optional

from app.core.exceptions import BadRequestException

LEVELS = ("easy", "medium", "hard")
LABELS = {"easy": "Easy", "medium": "Medium", "hard": "Hard"}
DEFAULT_MIX = {"easy": 30, "medium": 50, "hard": 20}


def normalise_level(value: Optional[str]) -> Optional[str]:
    level = (value or "").strip().lower()
    return level if level in LEVELS else None


def largest_remainder(total: int, weights: List[float]) -> List[int]:
    """Split `total` into integers proportional to `weights`, summing exactly to `total`."""
    if not weights:
        return []
    if total <= 0:
        return [0] * len(weights)
    weight_sum = sum(weights)
    if weight_sum <= 0:
        raise BadRequestException("Weights must be greater than zero")
    ideal = [total * w / weight_sum for w in weights]
    counts = [math.floor(x) for x in ideal]
    by_remainder = sorted(range(len(weights)), key=lambda i: ideal[i] - counts[i], reverse=True)
    for i in by_remainder[: total - sum(counts)]:
        counts[i] += 1
    return counts


def split_by_mix(total: int, mix: Dict[str, int]) -> Dict[str, int]:
    return dict(zip(LEVELS, largest_remainder(total, [mix[level] for level in LEVELS])))


def _matches(value: Optional[str], wanted: Optional[str]) -> bool:
    return wanted is None or (value or "").strip().lower() == wanted.strip().lower()


def _filter_sections(sections: List[Dict[str, Any]], sub_subject: Optional[str], topic: Optional[str]):
    filtered = []
    for section in sections:
        if not _matches(section.get("sub_subject"), sub_subject):
            continue
        topics = [t for t in section["topics"] if _matches(t["topic"], topic)]
        if topics:
            filtered.append({**section, "topics": topics})
    return filtered


def _node_weight(node: Dict[str, Any], counts_mode: bool) -> float:
    """In weights mode a node's weight (default 1); in counts mode, the sum of its subtopic counts."""
    if not counts_mode:
        return node.get("weight") or 1
    if "subtopics" in node:
        return sum(st["count"] for st in node["subtopics"])
    if "topics" in node:
        return sum(_node_weight(t, True) for t in node["topics"])
    return node["count"]


def _rows(sections: List[Dict[str, Any]], blueprint_mix: Dict[str, int],
          total: Optional[int], counts_mode: bool) -> List[Dict[str, Any]]:
    """Flatten to one row per subtopic with its question count and effective mix.
    `total=None` means counts mode used as-is; otherwise allocate `total` down the tree."""
    rows: List[Dict[str, Any]] = []
    section_totals = (
        [None] * len(sections) if total is None
        else largest_remainder(total, [_node_weight(s, counts_mode) for s in sections])
    )
    for section, section_total in zip(sections, section_totals):
        topics = section["topics"]
        topic_totals = (
            [None] * len(topics) if section_total is None
            else largest_remainder(section_total, [_node_weight(t, counts_mode) for t in topics])
        )
        for topic, topic_total in zip(topics, topic_totals):
            subtopics = topic["subtopics"]
            subtopic_totals = (
                [st["count"] for st in subtopics] if topic_total is None
                else largest_remainder(topic_total, [_node_weight(st, counts_mode) for st in subtopics])
            )
            for subtopic, count in zip(subtopics, subtopic_totals):
                mix = (subtopic.get("difficulty") or topic.get("difficulty")
                       or section.get("difficulty") or blueprint_mix)
                rows.append({
                    "sub_subject": section.get("sub_subject"),
                    "topic": topic["topic"],
                    "subtopic": subtopic["subtopic"],
                    "count": count,
                    "mix": mix,
                })
    return rows


def _split_difficulties(rows: List[Dict[str, Any]]) -> None:
    """Give each row an exact easy/medium/hard split (`row["split"]`).

    Rows sharing a mix form a group; the group's difficulty totals are fixed
    first (largest remainder), then assigned to rows by largest fractional
    part, so both each row's count and each group's totals are exact."""
    groups: Dict[tuple, List[int]] = {}
    for index, row in enumerate(rows):
        groups.setdefault(tuple(row["mix"][level] for level in LEVELS), []).append(index)

    for mix_key, indexes in groups.items():
        mix = dict(zip(LEVELS, mix_key))
        targets = split_by_mix(sum(rows[i]["count"] for i in indexes), mix)
        ideal = {i: {level: rows[i]["count"] * mix[level] / 100 for level in LEVELS} for i in indexes}
        for i in indexes:
            rows[i]["split"] = {level: math.floor(ideal[i][level]) for level in LEVELS}

        row_gap = {i: rows[i]["count"] - sum(rows[i]["split"].values()) for i in indexes}
        level_gap = {level: targets[level] - sum(rows[i]["split"][level] for i in indexes) for level in LEVELS}
        cells = sorted(
            ((ideal[i][level] - rows[i]["split"][level], i, level) for i in indexes for level in LEVELS),
            key=lambda cell: cell[0],
            reverse=True,
        )
        while any(gap > 0 for gap in row_gap.values()):
            for _, i, level in cells:
                if row_gap[i] > 0 and level_gap[level] > 0:
                    rows[i]["split"][level] += 1
                    row_gap[i] -= 1
                    level_gap[level] -= 1


def plan_quiz(
    blueprint: Dict[str, Any],
    sub_subject: Optional[str] = None,
    topic: Optional[str] = None,
    total_override: Optional[int] = None,
    difficulty_override: Optional[Dict[str, int]] = None,
) -> List[Dict[str, Any]]:
    """Slots for ONE quiz. Each slot: {sub_subject, topic, subtopic, difficulty, count}.

    - Weights mode (blueprint has total_questions): allocate over the FULL
      blueprint, then keep the filtered part — a Chemistry-only quiz gets
      Chemistry's share of the full total.
    - With `total_override`, the filtered part alone is re-allocated to that
      total (in counts mode the counts act as weights).
    - Counts mode without override: the counts as written.
    """
    counts_mode = blueprint.get("total_questions") is None
    blueprint_mix = blueprint.get("difficulty") or DEFAULT_MIX
    filtered = _filter_sections(blueprint["sections"], sub_subject, topic)
    if not filtered:
        raise BadRequestException(
            f"Nothing in the '{blueprint['_id']}' blueprint matches "
            f"sub_subject={sub_subject!r}, topic={topic!r}"
        )

    if total_override is not None:
        rows = _rows(filtered, blueprint_mix, total_override, counts_mode)
    elif counts_mode:
        rows = _rows(filtered, blueprint_mix, None, counts_mode)
    else:
        full = _rows(blueprint["sections"], blueprint_mix, blueprint["total_questions"], counts_mode)
        rows = [
            row for row in full
            if _matches(row["sub_subject"], sub_subject) and _matches(row["topic"], topic)
        ]

    if difficulty_override:
        for row in rows:
            row["mix"] = difficulty_override
    rows = [row for row in rows if row["count"] > 0]
    _split_difficulties(rows)

    slots: List[Dict[str, Any]] = []
    for row in rows:
        for level in LEVELS:
            if row["split"][level] > 0:
                slots.append({
                    "sub_subject": row["sub_subject"],
                    "topic": row["topic"],
                    "subtopic": row["subtopic"],
                    "difficulty": LABELS[level],
                    "count": row["split"][level],
                })
    return slots
