import pytest
from httpx import AsyncClient
from app.core.security import decode_token


@pytest.mark.asyncio
async def test_multi_tenant_complete_lifecycle(client: AsyncClient):
    # 0. Setup a Super Admin directly in DB or via promotion
    admin_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@gmail.com", "password": "admin123"},
    )
    assert admin_login.status_code == 200
    admin_data = admin_login.json()["data"]
    admin_token = admin_data["tokens"]["access_token"]
    admin_id = admin_data["user"]["id"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Promote user to super_admin for testing
    from app.db.mongodb import db_manager
    db = db_manager.get_database()
    await db.users.update_one({"_id": admin_id}, {"$set": {"role": "super_admin"}})

    # Re-login to get updated super_admin token
    super_admin_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@gmail.com", "password": "admin123"},
    )
    assert super_admin_login.status_code == 200
    super_token = super_admin_login.json()["data"]["tokens"]["access_token"]
    super_headers = {"Authorization": f"Bearer {super_token}"}
    assert super_admin_login.json()["data"]["user"]["role"] == "super_admin"

    # 1. Super Admin provisions two Tenant Admins (Allen and Apex)
    create_allen = await client.post(
        "/api/v1/admin/tenants",
        json={
            "full_name": "Allen Admin",
            "email": "admin@allen.in",
            "password": "Password@123",
            "subdomain": "allen",
            "organization_name": "Allen Career Institute",
            "phone_number": "9876543210",
        },
        headers=super_headers,
    )
    assert create_allen.status_code == 201
    allen_tenant = create_allen.json()["data"]
    allen_admin_id = allen_tenant["id"]
    assert allen_tenant["subdomain"] == "allen"

    create_apex = await client.post(
        "/api/v1/admin/tenants",
        json={
            "full_name": "Apex Admin",
            "email": "admin@apex.in",
            "password": "Password@123",
            "subdomain": "apex",
            "organization_name": "Apex Academy",
        },
        headers=super_headers,
    )
    assert create_apex.status_code == 201
    apex_tenant = create_apex.json()["data"]
    apex_admin_id = apex_tenant["id"]
    assert apex_tenant["subdomain"] == "apex"

    # 2. Super Admin lists tenants
    tenants_list = await client.get("/api/v1/admin/tenants", headers=super_headers)
    assert tenants_list.status_code == 200
    tenants_data = tenants_list.json()["data"]
    assert len(tenants_data) >= 2
    subdomains = [t["subdomain"] for t in tenants_data]
    assert "allen" in subdomains
    assert "apex" in subdomains

    # 3. Candidate registers on Allen subdomain (allen.prepmagnet.in)
    student_allen_email = "student.allen@gmail.com"
    reg_allen = await client.post(
        "/api/v1/auth/register",
        json={
            "email": student_allen_email,
            "full_name": "Allen Student 1",
            "password": "StudentPass@123",
            "target_exams": ["SSC CGL"],
        },
        headers={"X-Tenant-Subdomain": "allen"},
    )
    assert reg_allen.status_code == 200
    otp = reg_allen.json()["data"]["otp"]

    # Verify OTP
    verify_allen = await client.post(
        "/api/v1/auth/verify-otp",
        json={"email": student_allen_email, "otp": otp},
        headers={"X-Tenant-Subdomain": "allen"},
    )
    assert verify_allen.status_code == 200
    created_student = verify_allen.json()["data"]
    assert created_student["admin_id"] == allen_admin_id
    assert created_student["subdomain"] == "allen"
    allen_student_id = created_student["id"]

    # Verify in DB directly
    db_student = await db.users.find_one({"_id": allen_student_id})
    assert db_student["admin_id"] == allen_admin_id
    assert db_student["subdomain"] == "allen"

    # 4. Student logs in on Allen subdomain
    login_allen_student = await client.post(
        "/api/v1/auth/login",
        json={"email": student_allen_email, "password": "StudentPass@123"},
        headers={"X-Tenant-Subdomain": "allen"},
    )
    assert login_allen_student.status_code == 200
    student_login_data = login_allen_student.json()["data"]
    assert student_login_data["user"]["admin_id"] == allen_admin_id
    assert student_login_data["user"]["subdomain"] == "allen"

    token_payload = decode_token(student_login_data["tokens"]["access_token"])
    assert token_payload["admin_id"] == allen_admin_id
    assert token_payload["subdomain"] == "allen"

    # 5. Allen Admin logs in and creates another student directly via Admin Studio
    login_allen_admin = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@allen.in", "password": "Password@123"},
    )
    assert login_allen_admin.status_code == 200
    allen_admin_token = login_allen_admin.json()["data"]["tokens"]["access_token"]
    allen_admin_headers = {"Authorization": f"Bearer {allen_admin_token}"}

    direct_student = await client.post(
        "/api/v1/admin/users/student",
        json={
            "full_name": "Direct Enrolled Student",
            "email": "direct.student@allen.in",
            "password": "Password@123",
            "target_exams": ["SSC CGL"],
        },
        headers=allen_admin_headers,
    )
    assert direct_student.status_code == 201
    direct_student_data = direct_student.json()["data"]
    assert direct_student_data["admin_id"] == allen_admin_id
    assert direct_student_data["subdomain"] == "allen"

    # 6. Tenant Isolation Check:
    # Allen Admin queries users directory -> MUST only see Allen's students!
    allen_users_resp = await client.get("/api/v1/admin/users?page=1&page_size=20", headers=allen_admin_headers)
    assert allen_users_resp.status_code == 200
    allen_user_items = allen_users_resp.json()["data"]["items"]
    for u in allen_user_items:
        assert u["admin_id"] == allen_admin_id

    # Apex Admin logs in
    login_apex_admin = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@apex.in", "password": "Password@123"},
    )
    assert login_apex_admin.status_code == 200
    apex_admin_token = login_apex_admin.json()["data"]["tokens"]["access_token"]
    apex_admin_headers = {"Authorization": f"Bearer {apex_admin_token}"}

    # Apex Admin queries users -> MUST NOT see Allen's students!
    apex_users_resp = await client.get("/api/v1/admin/users?page=1&page_size=20", headers=apex_admin_headers)
    assert apex_users_resp.status_code == 200
    apex_user_items = apex_users_resp.json()["data"]["items"]
    assert len(apex_user_items) == 0  # Apex has no students yet

    # Apex Admin tries to view or modify/suspend Allen's student -> 403 Forbidden!
    forbidden_view = await client.get(f"/api/v1/admin/users/{allen_student_id}", headers=apex_admin_headers)
    assert forbidden_view.status_code == 403

    forbidden_suspend = await client.put(
        f"/api/v1/admin/users/{allen_student_id}",
        json={"is_active": False},
        headers=apex_admin_headers,
    )
    assert forbidden_suspend.status_code == 403

    # Allen Admin CAN suspend their own student
    allen_suspend = await client.put(
        f"/api/v1/admin/users/{allen_student_id}",
        json={"is_active": False},
        headers=allen_admin_headers,
    )
    assert allen_suspend.status_code == 200
    assert allen_suspend.json()["data"]["is_active"] is False

    # Super Admin CAN activate/suspend anyone across any tenant
    super_activate = await client.put(
        f"/api/v1/admin/users/{allen_student_id}",
        json={"is_active": True},
        headers=super_headers,
    )
    assert super_activate.status_code == 200
    assert super_activate.json()["data"]["is_active"] is True

    # Regular Admin forbidden from accessing tenant management
    forbidden_tenants = await client.get("/api/v1/admin/tenants", headers=allen_admin_headers)
    assert forbidden_tenants.status_code == 403

    # 7. Backward Compatibility Check (Root domain visitor without subdomain)
    root_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "student@gmail.com", "password": "student123"},
    )
    assert root_login.status_code == 200
    assert root_login.json()["success"] is True

