"""Per-subject taxonomy: subject -> (optional) sub-subject -> topic -> subtopics.

Stored as one document per subject in the `taxonomies` collection:
    {
      "_id": "Science",
      "sub_subjects": ["Physics", "Chemistry", "Biology"],   # [] when the subject has none
      "tree": [{"sub_subject": "Chemistry", "topic": "...", "subtopics": ["..."]}, ...]
    }

Sub-subjects are admin-defined only. Topics and subtopics also grow
automatically during ingestion, always under an existing sub-subject.
A list-of-entries shape (not dicts keyed by name) avoids MongoDB
dotted-field-name issues when names contain dots or special characters.
"""
from typing import Any, Dict, List, Optional, Tuple

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.exceptions import BadRequestException


def _same(a: Optional[str], b: Optional[str]) -> bool:
    return (a or "").strip().lower() == (b or "").strip().lower()


def canonical_sub_subject(value: Optional[str], allowed: List[str]) -> Optional[str]:
    """The list's own spelling of `value` (case-insensitive), or None if it isn't in the list."""
    if not value:
        return None
    for name in allowed:
        if _same(name, value):
            return name
    return None


def entries_for(tree: List[Dict[str, Any]], sub_subject: Optional[str]) -> List[Dict[str, Any]]:
    return [entry for entry in tree if _same(entry.get("sub_subject"), sub_subject)]


def merge_entry(tree: List[Dict[str, Any]], sub_subject: Optional[str], topic: str, subtopic: str) -> bool:
    """Add topic/subtopic to `tree` in place. Returns True if anything was added."""
    for entry in tree:
        if _same(entry.get("sub_subject"), sub_subject) and _same(entry["topic"], topic):
            if any(_same(existing, subtopic) for existing in entry["subtopics"]):
                return False
            entry["subtopics"].append(subtopic)
            return True
    tree.append({"sub_subject": sub_subject, "topic": topic, "subtopics": [subtopic]})
    return True


def build_tree(
    sub_subjects: Optional[Dict[str, Dict[str, List[str]]]],
    topics: Optional[Dict[str, List[str]]],
) -> Tuple[List[str], List[Dict[str, Any]]]:
    """Admin JSON -> (sub_subject list, stored tree)."""
    if sub_subjects is not None:
        tree = [
            {"sub_subject": name, "topic": topic, "subtopics": list(subtopic_list)}
            for name, topic_map in sub_subjects.items()
            for topic, subtopic_list in topic_map.items()
        ]
        return list(sub_subjects.keys()), tree
    tree = [
        {"sub_subject": None, "topic": topic, "subtopics": list(subtopic_list)}
        for topic, subtopic_list in (topics or {}).items()
    ]
    return [], tree


def build_taxonomy_prompt_section(
    entries: List[Dict[str, Any]], pick_from: Optional[List[str]] = None
) -> str:
    """Shared tagging-prompt fragment for theory and PYQ ingestion.

    `pick_from` is set when the LLM must also choose each item's sub-subject;
    it may only use names from that list.
    """
    parts: List[str] = []
    if pick_from:
        parts.append(
            "SUB-SUBJECTS — set \"sub_subject\" to EXACTLY one of these names, "
            f"never anything else: {', '.join(pick_from)}"
        )

    if not entries:
        parts.append(
            "No topics exist yet for this subject — freely assign concise, "
            "descriptive topics and subtopics based on the content."
        )
        return "\n\n".join(parts)

    lines: List[str] = []
    current_group: Optional[str] = "__none__"
    for entry in entries:
        group = entry.get("sub_subject")
        if pick_from and group != current_group:
            lines.append(f"[{group}]")
            current_group = group
        subtopics = ", ".join(entry["subtopics"]) or "(none listed)"
        lines.append(f"- Topic: {entry['topic']} | Subtopics: {subtopics}")

    parts.append(
        "EXISTING TOPIC/SUBTOPIC LIST (prefer these — copy the exact spelling if the\n"
        "content matches one of them):\n" + "\n".join(lines) + "\n\n"
        "RULE: If the content reasonably matches one of the topics/subtopics above,\n"
        "you MUST copy it exactly. Only write a new topic/subtopic if nothing above fits."
    )
    return "\n\n".join(parts)


class TaxonomyService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.collection = db["taxonomies"]

    async def get_doc(self, subject: str) -> Optional[Dict[str, Any]]:
        return await self.collection.find_one({"_id": subject})

    async def get_sub_subjects(self, subject: str) -> List[str]:
        doc = await self.get_doc(subject)
        return doc.get("sub_subjects", []) if doc else []

    async def set_taxonomy(self, subject: str, sub_subjects: List[str], tree: List[Dict[str, Any]]) -> None:
        """Admin upload/replace of a subject's whole taxonomy."""
        await self.collection.update_one(
            {"_id": subject}, {"$set": {"sub_subjects": sub_subjects, "tree": tree}}, upsert=True
        )

    async def add_entry(self, subject: str, sub_subject: Optional[str], topic: str, subtopic: str) -> None:
        """Fold an LLM-assigned topic/subtopic back into the taxonomy so later
        chunks and generation runs see it. Never creates a sub-subject: an item
        whose sub-subject couldn't be resolved in a subject that has
        sub-subjects is left out rather than parked under `null`."""
        doc = await self.get_doc(subject) or {"_id": subject, "sub_subjects": [], "tree": []}
        if doc.get("sub_subjects") and sub_subject is None:
            return
        tree = doc.get("tree", [])
        if merge_entry(tree, sub_subject, topic, subtopic):
            await self.collection.update_one({"_id": subject}, {"$set": {"tree": tree}}, upsert=True)

    async def require_subject(self, subject: str) -> None:
        """Uploads must target a subject that already has a taxonomy, so a typo or
        case mismatch ("chemistry" vs "Science") can't silently start a second,
        unrelated subject that generation will never read from."""
        if await self.get_doc(subject):
            return
        existing = [doc["_id"] async for doc in self.collection.find({}, {"_id": 1})]
        raise BadRequestException(
            f"No taxonomy for '{subject}'. Create it first with PUT /generation/taxonomy. "
            f"Existing subjects: {', '.join(existing) or '(none)'}"
        )

    async def resolve_admin_sub_subject(self, subject: str, value: Optional[str]) -> Optional[str]:
        """Validate an admin-supplied sub-subject; returns the list's spelling."""
        value = (value or "").strip() or None
        if value is None:
            return None
        allowed = await self.get_sub_subjects(subject)
        if not allowed:
            raise BadRequestException(
                f"'{subject}' has no sub-subjects defined. Leave sub_subject empty, or define "
                f"them first via PUT /generation/taxonomy."
            )
        canonical = canonical_sub_subject(value, allowed)
        if canonical is None:
            raise BadRequestException(
                f"Unknown sub-subject '{value}' for '{subject}'. Allowed: {', '.join(allowed)}"
            )
        return canonical
