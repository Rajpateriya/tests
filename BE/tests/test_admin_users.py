import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_admin_user_management(client: AsyncClient):
    # 1. Login as Admin
    admin_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@gmail.com", "password": "admin123"},
    )
    assert admin_login.status_code == 200
    admin_token = admin_login.json()["data"]["tokens"]["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 2. Login as Student
    student_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "student@gmail.com", "password": "student123"},
    )
    assert student_login.status_code == 200
    student_token = student_login.json()["data"]["tokens"]["access_token"]
    student_headers = {"Authorization": f"Bearer {student_token}"}

    # 3. Student forbidden from accessing /admin/users
    forbidden_resp = await client.get("/api/v1/admin/users", headers=student_headers)
    assert forbidden_resp.status_code == 403

    # 4. Admin retrieves paginated users (page 1, page_size 10)
    users_resp = await client.get("/api/v1/admin/users?page=1&page_size=10", headers=admin_headers)
    assert users_resp.status_code == 200
    users_data = users_resp.json()
    assert users_data["success"] is True
    assert users_data["data"]["page"] == 1
    assert users_data["data"]["page_size"] == 10
    assert len(users_data["data"]["items"]) <= 10
    assert users_data["data"]["total"] >= 10

    # 5. Admin updates a student's profile & makes them admin
    student_id = student_login.json()["data"]["user"]["id"]
    update_resp = await client.put(
        f"/api/v1/admin/users/{student_id}",
        json={
            "role": "admin",
            "coins_balance": 750,
            "subscription_plan": "ELITE",
            "subscription_status": "ACTIVE",
        },
        headers=admin_headers,
    )
    assert update_resp.status_code == 200
    updated_data = update_resp.json()["data"]
    assert updated_data["role"] == "admin"
    assert updated_data["profile"]["coins_balance"] == 750
    assert updated_data["profile"]["subscription_plan"] == "ELITE"

    # 6. Admin reverts user back to student
    revert_resp = await client.put(
        f"/api/v1/admin/users/{student_id}",
        json={
            "role": "student",
            "coins_balance": 150,
            "subscription_plan": "FREE",
            "subscription_status": "INACTIVE",
        },
        headers=admin_headers,
    )
    assert revert_resp.status_code == 200
    assert revert_resp.json()["data"]["role"] == "student"

    # 7. Admin cannot demote self
    admin_id = admin_login.json()["data"]["user"]["id"]
    demote_self = await client.put(
        f"/api/v1/admin/users/{admin_id}",
        json={"role": "student"},
        headers=admin_headers,
    )
    assert demote_self.status_code == 403
