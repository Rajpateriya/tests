from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.api.v1.deps import require_admin, require_super_admin
from app.core.config import settings
from app.core.rate_limiter import check_rate_limit
from app.db.mongodb import db_manager, get_db
from app.db.redis import redis_manager
from app.models.test import TestType
from app.models.user import UserRole
from app.schemas.common import APIResponse
from app.schemas.pass_schema import PassCreateRequest, PassResponse, PassUpdateRequest
from app.schemas.test import AdminTestDetailOut, TestCreate, TestDetailOut, TestQuestionOut, TestUpdate
from app.schemas.user import (
    PaginatedUsersResponse,
    StudentCreateRequest,
    TenantAdminCreateRequest,
    TenantAdminResponse,
    TenantAdminUpdateRequest,
    UserAdminUpdate,
    UserResponse,
)
from app.services.auth_service import AuthService
from app.services.pass_service import PassService
from app.services.test_service import TestService

router = APIRouter(prefix="/admin", tags=["Admin Operations"], dependencies=[Depends(check_rate_limit)])


@router.post("/tests", response_model=APIResponse[TestDetailOut], status_code=status.HTTP_201_CREATED)
async def create_test_config(
    req: TestCreate,
    admin: UserResponse = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Admin: Manually configure a mock test specifying exact question IDs and marking scheme."""
    service = TestService(db)
    admin_id = admin.id if admin.role == UserRole.ADMIN else None
    test = await service.create_test(req, admin_id=admin_id)
    return APIResponse(
        success=True,
        message="Mock test configured successfully",
        data=test,
    )


@router.post("/tests/auto-generate", response_model=APIResponse[TestDetailOut], status_code=status.HTTP_201_CREATED)
async def auto_generate_mock(
    title: str = Query(..., description="Title of the mock test"),
    test_type: TestType = Query(TestType.FULL),
    target_exam: str = Query("SSC CGL"),
    subject: Optional[str] = Query(None),
    topic: Optional[str] = Query(None),
    num_questions: int = Query(25, ge=1, le=100),
    duration_minutes: int = Query(30, ge=5, le=180),
    positive_marks: float = Query(2.0),
    negative_marks: float = Query(0.5),
    admin: UserResponse = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Admin: Dynamically generate a test by randomly sampling questions."""
    service = TestService(db)
    admin_id = admin.id if admin.role == UserRole.ADMIN else None
    test = await service.auto_generate_mock(
        title=title,
        test_type=test_type,
        target_exam=target_exam,
        subject=subject,
        topic=topic,
        num_questions=num_questions,
        duration_minutes=duration_minutes,
        positive_marks=positive_marks,
        negative_marks=negative_marks,
        admin_id=admin_id,
    )
    return APIResponse(
        success=True,
        message=f"Automatically compiled test with {test.total_questions} questions",
        data=test,
    )


@router.get("/tests/{test_id}", response_model=APIResponse[AdminTestDetailOut])
async def get_test_admin(
    test_id: str,
    admin: UserResponse = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Admin: one test in full (inactive ones too), with the courses it is tagged to."""
    test = await TestService(db).get_admin_test(test_id)
    return APIResponse(success=True, message="Test retrieved", data=test)


@router.get("/tests/{test_id}/questions", response_model=APIResponse[List[TestQuestionOut]])
async def get_test_questions_admin(
    test_id: str,
    admin: UserResponse = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Admin: the test's questions in order, with correct answers and explanations."""
    questions = await TestService(db).list_questions_for_admin(test_id)
    return APIResponse(success=True, message=f"{len(questions)} questions", data=questions)


@router.put("/tests/{test_id}", response_model=APIResponse[AdminTestDetailOut])
async def update_test_admin(
    test_id: str,
    req: TestUpdate,
    admin: UserResponse = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Admin: change a test's title, description, duration, marking or on/off state."""
    if admin.role == UserRole.ADMIN:
        test_doc = await db.tests.find_one({"_id": test_id}, {"admin_id": 1})
        if not test_doc:
            raise NotFoundException(f"Test '{test_id}' not found")
        if test_doc.get("admin_id") and test_doc.get("admin_id") != admin.id:
            raise ForbiddenException("You can only modify tests belonging to your organization")
    test = await TestService(db).update_test(test_id, req)
    return APIResponse(success=True, message="Test updated", data=test)


@router.delete("/tests/{test_id}", response_model=APIResponse[dict])
async def delete_test_admin(
    test_id: str,
    admin: UserResponse = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Admin: delete a test and remove it from every course that included it."""
    if admin.role == UserRole.ADMIN:
        test_doc = await db.tests.find_one({"_id": test_id}, {"admin_id": 1})
        if not test_doc:
            raise NotFoundException(f"Test '{test_id}' not found")
        if test_doc.get("admin_id") and test_doc.get("admin_id") != admin.id:
            raise ForbiddenException("You can only delete tests belonging to your organization")
    result = await TestService(db).delete_test(test_id)
    return APIResponse(success=True, message=f"Test '{result['title']}' deleted", data=result)


@router.get("/stats", response_model=APIResponse[dict])
async def get_platform_stats(
    admin: UserResponse = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Admin: Overview metrics of platform usage (scoped to tenant if not super_admin)."""
    if admin.role == UserRole.SUPER_ADMIN:
        users_count = await db.users.count_documents({})
        questions_count = await db.questions.count_documents({})
        tests_count = await db.tests.count_documents({})
        courses_count = await db.courses.count_documents({})
        attempts_count = await db.attempts.count_documents({})
        completed_attempts = await db.attempts.count_documents({"status": "COMPLETED"})
        open_tickets = await db.support_tickets.count_documents({"status": "OPEN"})
        tenants_count = await db.users.count_documents({"role": UserRole.ADMIN.value})
    else:
        tenant_id = admin.id
        users_count = await db.users.count_documents({"admin_id": tenant_id})
        questions_count = await db.questions.count_documents({})
        tests_count = await db.tests.count_documents({"$or": [{"admin_id": tenant_id}, {"admin_id": None}]})
        courses_count = await db.courses.count_documents({"$or": [{"admin_id": tenant_id}, {"created_by": tenant_id}, {"admin_id": None}]})
        student_docs = await db.users.find({"admin_id": tenant_id}, {"_id": 1}).to_list(length=10000)
        student_ids = [u["_id"] for u in student_docs]
        if student_ids:
            attempts_count = await db.attempts.count_documents({"user_id": {"$in": student_ids}})
            completed_attempts = await db.attempts.count_documents({"user_id": {"$in": student_ids}, "status": "COMPLETED"})
            open_tickets = await db.support_tickets.count_documents({"user_id": {"$in": student_ids}, "status": "OPEN"})
        else:
            attempts_count = 0
            completed_attempts = 0
            open_tickets = 0
        tenants_count = 1

    return APIResponse(
        success=True,
        message="Platform metrics retrieved",
        data={
            "total_users": users_count,
            "total_questions_in_bank": questions_count,
            "total_configured_tests": tests_count,
            "total_courses": courses_count,
            "total_attempts": attempts_count,
            "completed_attempts": completed_attempts,
            "open_support_tickets": open_tickets,
            "total_tenants": tenants_count,
        },
    )


@router.get("/health", response_model=APIResponse[dict])
async def check_health(
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """System health check verifying database and Redis connectivity."""
    db_status = "connected"
    try:
        await db.command("ping")
    except Exception as e:
        db_status = f"error: {str(e)}"

    redis_status = "fallback_memory" if redis_manager.is_fallback else "connected"

    return APIResponse(
        success=True,
        message="System health check",
        data={
            "app": settings.PROJECT_NAME,
            "environment": settings.ENVIRONMENT,
            "database": {
                "status": db_status,
                "is_mock": db_manager.is_mock,
            },
            "cache": {
                "status": redis_status,
                "is_fallback": redis_manager.is_fallback,
            },
        },
    )


# --- User Management Operations (Scoped with Tenant Isolation) ---
@router.get("/users", response_model=APIResponse[PaginatedUsersResponse])
async def list_users(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Page size (default 10)"),
    search: Optional[str] = Query(None, description="Search by email or full name"),
    role: Optional[str] = Query(None, description="Filter by role: student | admin"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    tenant_admin_id: Optional[str] = Query(None, description="Super Admin: filter by tenant admin ID"),
    admin: UserResponse = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Admin: Retrieve paginated user directory with search and filter capabilities."""
    auth_service = AuthService(db)
    result = await auth_service.get_users_paginated(
        page=page,
        page_size=page_size,
        search=search,
        role=role,
        is_active=is_active,
        tenant_admin_id=tenant_admin_id,
        requesting_admin=admin,
    )
    return APIResponse(
        success=True,
        message=f"Retrieved {len(result.items)} users (Page {result.page} of {result.total_pages})",
        data=result,
    )


@router.post("/users/student", response_model=APIResponse[UserResponse], status_code=status.HTTP_201_CREATED)
async def create_student(
    req: StudentCreateRequest,
    admin: UserResponse = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Admin: Directly enroll / create a new Student under this admin's organization."""
    auth_service = AuthService(db)
    student = await auth_service.admin_create_student(req, admin)
    return APIResponse(
        success=True,
        message=f"Student '{student.full_name}' created successfully",
        data=student,
    )


@router.get("/users/{user_id}", response_model=APIResponse[UserResponse])
async def get_user_detail(
    user_id: str,
    admin: UserResponse = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Admin: Get detailed profile of a specific user."""
    auth_service = AuthService(db)
    user = await auth_service.admin_get_user(user_id, admin_user=admin)
    return APIResponse(
        success=True,
        message="User profile retrieved",
        data=user,
    )


@router.put("/users/{user_id}", response_model=APIResponse[UserResponse])
async def update_user_profile(
    user_id: str,
    req: UserAdminUpdate,
    admin: UserResponse = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Admin: Edit user's profile, modify coins/subscription/status."""
    auth_service = AuthService(db)
    updated = await auth_service.admin_update_user(user_id, req, admin)
    return APIResponse(
        success=True,
        message=f"User '{updated.full_name}' updated successfully",
        data=updated,
    )


@router.delete("/users/{user_id}", response_model=APIResponse[dict])
async def delete_user(
    user_id: str,
    admin: UserResponse = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Admin: Delete a user account."""
    auth_service = AuthService(db)
    await auth_service.admin_delete_user(user_id, admin)
    return APIResponse(
        success=True,
        message="User deleted successfully",
        data={"user_id": user_id},
    )


# ─── Super Admin: Tenant / Admin Management ──────────────────────────────────

@router.get("/tenants", response_model=APIResponse[List[TenantAdminResponse]])
async def list_tenants(
    super_admin: UserResponse = Depends(require_super_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Super Admin: List all Tenant Admins with their subdomains and metrics."""
    auth_service = AuthService(db)
    tenants = await auth_service.list_tenant_admins(super_admin)
    return APIResponse(
        success=True,
        message=f"Retrieved {len(tenants)} tenant organizations",
        data=tenants,
    )


@router.post("/tenants", response_model=APIResponse[TenantAdminResponse], status_code=status.HTTP_201_CREATED)
async def create_tenant(
    req: TenantAdminCreateRequest,
    super_admin: UserResponse = Depends(require_super_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Super Admin: Create a new Tenant Admin with custom subdomain."""
    auth_service = AuthService(db)
    created = await auth_service.create_tenant_admin(req, super_admin)
    return APIResponse(
        success=True,
        message=f"Tenant Admin '{created.full_name}' for subdomain '{created.subdomain}' created successfully",
        data=created,
    )


@router.put("/tenants/{admin_id}", response_model=APIResponse[TenantAdminResponse])
async def update_tenant(
    admin_id: str,
    req: TenantAdminUpdateRequest,
    super_admin: UserResponse = Depends(require_super_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Super Admin: Update a Tenant Admin's organization or subdomain."""
    auth_service = AuthService(db)
    updated = await auth_service.update_tenant_admin(admin_id, req, super_admin)
    return APIResponse(
        success=True,
        message=f"Tenant Admin '{updated.full_name}' updated successfully",
        data=updated,
    )


@router.delete("/tenants/{admin_id}", response_model=APIResponse[dict])
async def delete_tenant(
    admin_id: str,
    super_admin: UserResponse = Depends(require_super_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Super Admin: Delete or revoke a Tenant Admin."""
    auth_service = AuthService(db)
    await auth_service.delete_tenant_admin(admin_id, super_admin)
    return APIResponse(success=True, message="Tenant Admin deleted successfully", data={"admin_id": admin_id})


# ─── Admin Pass Management Routes ────────────────────────────────────────────

@router.get("/passes", response_model=APIResponse[List[PassResponse]])
async def list_passes_admin(
    admin: UserResponse = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Admin: List passes (scoped to admin_id if tenant admin; all passes if super_admin)."""
    service = PassService(db)
    admin_filter = admin.id if admin.role == UserRole.ADMIN else None
    passes = await service.list_all_passes_admin(admin_id=admin_filter)
    return APIResponse(
        success=True,
        message="Passes retrieved successfully",
        data=passes,
    )


@router.post("/passes", response_model=APIResponse[PassResponse], status_code=status.HTTP_201_CREATED)
async def create_pass_admin(
    req: PassCreateRequest,
    admin: UserResponse = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Admin: Create a new targeted exam pass dynamically selecting which courses are covered."""
    service = PassService(db)
    admin_id = admin.id if admin.role == UserRole.ADMIN else None
    created = await service.create_pass(req, admin_id=admin_id)
    return APIResponse(
        success=True,
        message=f"Pass '{created.title}' created successfully",
        data=created,
    )


@router.put("/passes/{pass_id}", response_model=APIResponse[PassResponse])
async def update_pass_admin(
    pass_id: str,
    req: PassUpdateRequest,
    admin: UserResponse = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Admin: Update an existing pass (price, duration, covered courses, active status)."""
    service = PassService(db)
    if admin.role == UserRole.ADMIN:
        existing = await service.pass_repo.get_by_id(pass_id)
        if not existing:
            raise NotFoundException(f"Pass '{pass_id}' not found")
        if existing.get("admin_id") and existing.get("admin_id") != admin.id:
            raise ForbiddenException("You can only modify passes belonging to your organization")
    updated = await service.update_pass(pass_id, req)
    return APIResponse(
        success=True,
        message=f"Pass '{updated.title}' updated successfully",
        data=updated,
    )


@router.delete("/passes/{pass_id}", response_model=APIResponse[dict])
async def delete_pass_admin(
    pass_id: str,
    admin: UserResponse = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Admin: Delete or remove a pass from the system."""
    service = PassService(db)
    if admin.role == UserRole.ADMIN:
        existing = await service.pass_repo.get_by_id(pass_id)
        if not existing:
            raise NotFoundException(f"Pass '{pass_id}' not found")
        if existing.get("admin_id") and existing.get("admin_id") != admin.id:
            raise ForbiddenException("You can only delete passes belonging to your organization")
    await service.delete_pass(pass_id)
    return APIResponse(
        success=True,
        message="Pass deleted successfully",
        data={"pass_id": pass_id},
    )
