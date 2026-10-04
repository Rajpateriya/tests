"""Admin endpoints for the AI question-generation pipeline.

Order of use:
  1. PUT  /generation/taxonomy          subject -> sub-subjects -> topics -> subtopics
  2. POST /generation/theory/upload     theory PDFs (fact source)
     POST /generation/pyq/upload        past papers (tone/format examples)
  3. POST /generation/quiz              fill the question bank from the taxonomy
  4. PUT  /generation/blueprint         shape of one quiz
     POST /generation/blueprint/{s}/plan  preview one quiz's exact slots
  5. POST /generation/assemble          build N quizzes (tests) from the bank
"""
import re
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.api.v1.deps import require_admin
from app.core.rate_limiter import check_rate_limit
from app.db.mongodb import get_db
from app.models.quiz_blueprint import QuizBlueprint
from app.repositories.theory_chunk_repo import TheoryChunkRepository
from app.schemas.common import APIResponse
from app.schemas.generation import (
    AssembleRequest,
    BlueprintPlanRequest,
    PYQUploadResponse,
    QuestionGenerateRequest,
    TaxonomySetRequest,
    TheoryUploadResponse,
)
from app.schemas.user import UserResponse
from app.services.pyq_ingestion_service import ingest_pyq_pdf
from app.services.quiz_assembly_service import QuizAssemblyService
from app.services.quiz_blueprint_service import QuizBlueprintService
from app.services.quiz_generation_service import QuizGenerationService
from app.services.taxonomy_service import TaxonomyService, build_tree
from app.services.theory_ingestion_service import ingest_theory_pdf

router = APIRouter(
    prefix="/generation", tags=["AI Quiz Generation"], dependencies=[Depends(check_rate_limit)]
)


def _check_pdfs(files: List[UploadFile]) -> None:
    for f in files:
        if not f.filename or not f.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail=f"'{f.filename}' is not a PDF file")


# ── Taxonomy ──────────────────────────────────────────────────────


@router.put("/taxonomy", response_model=APIResponse[dict])
async def set_taxonomy(
    req: TaxonomySetRequest,
    admin: UserResponse = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Admin: define (or replace) a subject's structure.

    Send `sub_subjects` for a subject with branches (Science -> Physics /
    Chemistry / Biology), or `topics` for one without. Sub-subjects are only
    ever created here; ingestion adds topics/subtopics under them, never new
    sub-subjects.
    """
    sub_subjects, tree = build_tree(req.sub_subjects, req.topics)
    await TaxonomyService(db).set_taxonomy(req.subject, sub_subjects, tree)
    return APIResponse(
        success=True,
        message=f"Taxonomy set for '{req.subject}'",
        data={"subject": req.subject, "sub_subjects": sub_subjects, "topics": len(tree)},
    )


@router.get("/taxonomy", response_model=APIResponse[List[dict]])
async def list_taxonomies(db: AsyncIOMotorDatabase = Depends(get_db)):
    """Every subject that has a taxonomy, for admin subject pickers."""
    docs = await db.taxonomies.find({}, {"sub_subjects": 1, "tree": 1}).to_list(length=500)
    data = [
        {"subject": d["_id"], "sub_subjects": d.get("sub_subjects", []), "topics": len(d.get("tree", []))}
        for d in docs
    ]
    return APIResponse(success=True, message=f"{len(data)} subjects", data=data)


@router.get("/taxonomy/{subject}", response_model=APIResponse[dict])
async def get_taxonomy(subject: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    """The subject's current taxonomy, including topics/subtopics added by ingestion."""
    doc = await TaxonomyService(db).get_doc(subject)
    if not doc:
        raise HTTPException(status_code=404, detail=f"No taxonomy for subject '{subject}'")
    return APIResponse(
        success=True,
        message=f"Taxonomy for '{subject}'",
        data={"subject": doc["_id"], "sub_subjects": doc.get("sub_subjects", []), "tree": doc.get("tree", [])},
    )


# ── Uploads ───────────────────────────────────────────────────────


@router.post(
    "/theory/upload",
    response_model=APIResponse[TheoryUploadResponse],
    status_code=status.HTTP_201_CREATED,
)
async def upload_theory_pdf(
    subject: str = Form(...),
    sub_subject: Optional[str] = Form(None),
    files: List[UploadFile] = File(...),
    admin: UserResponse = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Admin: upload one or more theory PDFs (e.g. NCERT chapters).

    `sub_subject` is optional but recommended (a chapter is one branch). It
    must be one of the subject's sub-subjects. If left empty for a subject
    that has sub-subjects, the LLM picks one per chunk from the list.

    The LLM decides ONE topic per PDF (reusing an existing topic when the PDF is
    about it); per-chunk tagging then only chooses subtopics.
    """
    _check_pdfs(files)
    taxonomy = TaxonomyService(db)
    await taxonomy.require_subject(subject)
    sub_subject = await taxonomy.resolve_admin_sub_subject(subject, sub_subject)

    totals = {"chunks_ingested": 0, "chunks_failed": 0, "chunks_duplicate": 0,
              "sub_subject_unresolved": 0, "total_chunks": 0}
    per_file = []
    for f in files:
        pdf_bytes = await f.read()
        result = await ingest_theory_pdf(
            db, pdf_bytes, subject=subject, source_pdf=f.filename, sub_subject=sub_subject
        )
        for key in totals:
            totals[key] += result[key]
        per_file.append({"source_pdf": f.filename, **result})

    return APIResponse(
        success=True,
        message=f"Ingested {totals['chunks_ingested']} theory chunks from {len(files)} file(s)",
        data=TheoryUploadResponse(
            subject=subject, sub_subject=sub_subject, files_processed=len(files), per_file=per_file, **totals
        ),
    )


@router.post(
    "/pyq/upload",
    response_model=APIResponse[PYQUploadResponse],
    status_code=status.HTTP_201_CREATED,
)
async def upload_pyq_pdf(
    subject: str = Form(...),
    target_exam: str = Form(...),
    sub_subject: Optional[str] = Form(None),
    files: List[UploadFile] = File(...),
    admin: UserResponse = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Admin: upload one or more past-year question papers (PDFs) for a subject + exam.

    Leave `sub_subject` empty for mixed papers — the LLM tags each question's
    sub-subject from the subject's list. Set it only for single-branch papers.
    """
    _check_pdfs(files)
    taxonomy = TaxonomyService(db)
    await taxonomy.require_subject(subject)
    sub_subject = await taxonomy.resolve_admin_sub_subject(subject, sub_subject)

    totals = {"questions_ingested": 0, "questions_failed": 0, "duplicates_skipped": 0,
              "sub_subject_unresolved": 0}
    per_file = []
    for f in files:
        pdf_bytes = await f.read()
        result = await ingest_pyq_pdf(
            db, pdf_bytes, subject=subject, target_exam=target_exam,
            source_pdf=f.filename, sub_subject=sub_subject,
        )
        for key in totals:
            totals[key] += result[key]
        per_file.append({"source_pdf": f.filename, **result})

    return APIResponse(
        success=True,
        message=f"Ingested {totals['questions_ingested']} PYQs from {len(files)} file(s)",
        data=PYQUploadResponse(
            subject=subject,
            sub_subject=sub_subject,
            target_exam=target_exam,
            files_processed=len(files),
            per_file=per_file,
            **totals,
        ),
    )


@router.get("/subjects", response_model=APIResponse[List[str]])
async def list_theory_subjects(db: AsyncIOMotorDatabase = Depends(get_db)):
    """List subjects that have ingested theory content, for admin dropdowns."""
    subjects = await TheoryChunkRepository(db).distinct_subjects()
    return APIResponse(success=True, message=f"Found {len(subjects)} subjects", data=subjects)


# ── Question bank generation ──────────────────────────────────────


@router.post("/quiz", response_model=APIResponse[Dict[str, Any]], status_code=status.HTTP_201_CREATED)
async def generate_questions(
    req: QuestionGenerateRequest,
    admin: UserResponse = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Admin: fill the question bank from the taxonomy.

    Every matching subtopic is brought up to `per_subtopic` questions for the
    exam, split by `difficulty`. Only the missing gap is generated, so if a
    long run stops partway, send the same request again.
    """
    result = await QuizGenerationService(db).generate_questions(
        target_exam=req.target_exam,
        subject=req.subject,
        sub_subject=req.sub_subject,
        topic=req.topic,
        per_subtopic=req.per_subtopic,
        difficulty=req.difficulty.model_dump(),
        allow_ai_knowledge=req.allow_ai_knowledge,
        style_notes=req.style_notes,
    )
    return APIResponse(
        success=True,
        message=(
            f"Saved {result['saved']} new questions ({result['flagged_for_review']} flagged for review, "
            f"{result['shortfall']} still short) across {result['subtopics']} subtopics"
            + (
                f" — {len(result['skipped_no_theory'])} subtopic(s) skipped: no theory uploaded"
                if result["skipped_no_theory"] else ""
            )
        ),
        data=result,
    )


@router.get("/bank/{subject}", response_model=APIResponse[Dict[str, Any]])
async def bank_summary(
    subject: str,
    target_exam: Optional[str] = None,
    admin: UserResponse = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """How many approved questions the bank holds per sub-subject/topic/subtopic/difficulty
    (and how many are not yet used in any test), plus how many await review."""
    match: Dict[str, Any] = {"subject": subject}
    if target_exam:
        match["target_exam"] = {"$regex": f"^{re.escape(target_exam)}$", "$options": "i"}
    pipeline = [
        {"$match": match},
        {"$group": {
            "_id": {"sub_subject": "$sub_subject", "topic": "$topic", "subtopic": "$subtopic",
                    "difficulty": "$difficulty"},
            "count": {"$sum": 1},
            "unused": {"$sum": {"$cond": [{"$gt": [{"$ifNull": ["$used_in_tests", 0]}, 0]}, 0, 1]}},
        }},
    ]
    groups = await db.questions.aggregate(pipeline).to_list(length=5000)
    rows = sorted(
        ({**g["_id"], "count": g["count"], "unused": g["unused"]} for g in groups),
        key=lambda r: (r.get("sub_subject") or "", r.get("topic") or "", r.get("subtopic") or "",
                       ["Easy", "Medium", "Hard"].index(r["difficulty"]) if r.get("difficulty") in ("Easy", "Medium", "Hard") else 9),
    )
    pending = await db.staging_questions.count_documents({**match, "status": "pending_review"})
    return APIResponse(
        success=True,
        message=f"{sum(r['count'] for r in rows)} questions in the bank for '{subject}'",
        data={"subject": subject, "target_exam": target_exam, "rows": rows,
              "total": sum(r["count"] for r in rows), "unused": sum(r["unused"] for r in rows),
              "pending_review": pending},
    )


# ── Blueprint (shape of one quiz) ─────────────────────────────────


@router.put("/blueprint", response_model=APIResponse[Dict[str, Any]])
async def set_blueprint(
    req: QuizBlueprint,
    admin: UserResponse = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Admin: set/replace the shape of one quiz for a subject.

    Either `total_questions` + `weight`s, or a `count` on every subtopic.
    `difficulty` mixes can be set on the blueprint and overridden on any
    section, topic or subtopic.
    """
    doc = await QuizBlueprintService(db).set_blueprint(req)
    return APIResponse(
        success=True,
        message=f"Blueprint set for '{req.subject}' ({len(doc['sections'])} sections)",
        data={"subject": doc.pop("_id"), **doc},
    )


@router.get("/blueprint/{subject}", response_model=APIResponse[Dict[str, Any]])
async def get_blueprint(subject: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    """Fetch the current quiz blueprint for a subject."""
    doc = await QuizBlueprintService(db).require_blueprint(subject)
    return APIResponse(
        success=True, message=f"Blueprint for '{subject}'", data={"subject": doc.pop("_id"), **doc}
    )


@router.post("/blueprint/{subject}/generate-starter", response_model=APIResponse[Dict[str, Any]])
async def generate_starter_blueprint(
    subject: str,
    default_count: int = 3,
    admin: UserResponse = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Admin: draft a blueprint from the taxonomy (every subtopic gets
    `default_count`). NOT saved — review/edit it, then PUT /generation/blueprint."""
    starter = await QuizBlueprintService(db).generate_starter_blueprint(subject, default_count)
    return APIResponse(
        success=True,
        message=f"Starter blueprint for '{subject}' — review and PUT to save",
        data=starter,
    )


@router.post("/blueprint/{subject}/plan", response_model=APIResponse[Dict[str, Any]])
async def plan_blueprint(
    subject: str,
    req: BlueprintPlanRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Preview one quiz's exact slots (subtopic x difficulty x count) — nothing is created."""
    plan = await QuizBlueprintService(db).plan(
        subject,
        sub_subject=req.sub_subject,
        topic=req.topic,
        questions_per_quiz=req.questions_per_quiz,
        difficulty=req.difficulty.model_dump() if req.difficulty else None,
    )
    return APIResponse(success=True, message=f"{plan['questions_per_quiz']} questions per quiz", data=plan)


# ── Assembly ──────────────────────────────────────────────────────


@router.post("/assemble", response_model=APIResponse[Dict[str, Any]], status_code=status.HTTP_201_CREATED)
async def assemble_quizzes(
    req: AssembleRequest,
    admin: UserResponse = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Admin: build `quizzes` ready-to-take tests from the question bank, each
    matching the blueprint exactly. Only complete quizzes are created; if the
    bank is short, `missing` lists the slots to fill via POST /generation/quiz."""
    result = await QuizAssemblyService(db).assemble(
        target_exam=req.target_exam,
        subject=req.subject,
        quizzes=req.quizzes,
        sub_subject=req.sub_subject,
        topic=req.topic,
        questions_per_quiz=req.questions_per_quiz,
        difficulty=req.difficulty.model_dump() if req.difficulty else None,
        max_question_reuse=req.max_question_reuse,
        title_prefix=req.title_prefix,
        duration_minutes=req.duration_minutes,
        positive_marks=req.positive_marks,
        negative_marks=req.negative_marks,
    )
    return APIResponse(
        success=True,
        message=f"Created {result['created']} of {result['requested']} quizzes",
        data=result,
    )


# ── Review ────────────────────────────────────────────────────────


@router.get("/staging", response_model=APIResponse[List[dict]])
async def list_staging_questions(
    admin: UserResponse = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Admin: list generated questions flagged as low-groundedness, pending human review."""
    cursor = db.staging_questions.find(
        {"status": "pending_review"}, {"question_embedding": 0}
    ).sort("created_at", -1)
    items = await cursor.to_list(length=200)
    return APIResponse(success=True, message=f"{len(items)} questions pending review", data=items)


@router.post("/staging/{question_id}/approve", response_model=APIResponse[dict])
async def approve_staging_question(
    question_id: str,
    admin: UserResponse = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Admin: approve a flagged question, moving it into the live question bank."""
    doc = await db.staging_questions.find_one({"_id": question_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Staging question not found")

    doc.pop("status", None)
    await db.questions.insert_one(doc)
    await db.staging_questions.delete_one({"_id": question_id})

    return APIResponse(success=True, message="Question approved and published", data={"id": question_id})


@router.delete("/staging/{question_id}")
async def reject_staging_question(
    question_id: str,
    admin: UserResponse = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Admin: reject a flagged question, discarding it."""
    result = await db.staging_questions.delete_one({"_id": question_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Staging question not found")
    return APIResponse(success=True, message="Question rejected and discarded", data={"id": question_id})
