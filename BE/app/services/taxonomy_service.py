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
            "No topics exist yet for this subject. Create them from the content:\n"
            "- TOPIC = the chapter-level or unit-level area the content belongs to. "
            "It must NOT simply repeat the subject's name, and must not be too broad "
            "or too narrow.\n"
            "- SUBTOPIC = one specific concept, rule, method or idea inside that topic. "
            "Never use the chapter title, a worked example, activity, experiment or "
            "exercise name, or generic labels like \"Summary\", \"Exercises\", "
            "\"Introduction\" or \"Practice\"; file such material under the concept "
            "it illustrates.\n"
            "- Use the same topic and subtopic names for excerpts about the same concept."
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
        "EXISTING TOPIC/SUBTOPIC LIST:\n" + "\n".join(lines) + "\n\n"
        "HOW TO TAG EACH EXCERPT:\n"
        "1. Read the excerpt and decide what concept it actually teaches or tests.\n"
        "2. If an existing subtopic above is genuinely about that concept, copy its\n"
        "   topic and subtopic EXACTLY. Being merely in the same general area is NOT\n"
        "   enough — do not force a fit.\n"
        "3. If no existing subtopic is genuinely about it, write a NEW specific subtopic\n"
        "   (a concept name — never a generic label like \"Summary\" or \"Exercises\"),\n"
        "   placed under the existing topic it belongs to.\n"
        "4. Only write a new topic if the excerpt belongs to none of the existing topics."
    )
    return "\n\n".join(parts)


def subtopics_under(tree: List[Dict[str, Any]], sub_subject: Optional[str], topic: str) -> List[str]:
    """Subtopics already stored under `topic`; `sub_subject=None` means any branch."""
    seen: List[str] = []
    for entry in tree:
        if not _same(entry["topic"], topic):
            continue
        if sub_subject is not None and not _same(entry.get("sub_subject"), sub_subject):
            continue
        for name in entry["subtopics"]:
            if not any(_same(name, other) for other in seen):
                seen.append(name)
    return seen


def build_fixed_topic_section(
    topic: str, existing_subtopics: List[str], pick_from: Optional[List[str]] = None
) -> str:
    """Tagging-prompt fragment when the whole PDF already has ONE topic: the LLM
    only chooses (or creates) the subtopic for each excerpt."""
    parts: List[str] = []
    if pick_from:
        parts.append(
            "SUB-SUBJECTS — set \"sub_subject\" to EXACTLY one of these names, "
            f"never anything else: {', '.join(pick_from)}"
        )
    known = ", ".join(existing_subtopics) if existing_subtopics else "(none yet)"
    parts.append(
        f"Every excerpt belongs to the topic \"{topic}\". Set \"topic\" to exactly \"{topic}\" "
        "for every excerpt.\n\n"
        f"EXISTING SUBTOPICS under this topic: {known}\n\n"
        "HOW TO CHOOSE THE SUBTOPIC FOR EACH EXCERPT:\n"
        "1. Read the excerpt and decide what concept, rule, method or idea it teaches.\n"
        "2. If an existing subtopic is genuinely about that concept, copy it EXACTLY.\n"
        "   Being merely in the same general area is NOT enough.\n"
        "3. Otherwise write a NEW specific subtopic naming that concept. Never use the\n"
        "   chapter title, a worked example, activity, experiment or exercise name, or a\n"
        "   generic label such as \"Summary\", \"Exercises\", \"Introduction\" or \"Practice\" —\n"
        "   file such material under the concept it illustrates.\n"
        "4. Do not create a second subtopic for a concept that already has one."
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
