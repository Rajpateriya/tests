import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_and_login(client: AsyncClient):
    # 1. Register new user
    reg_payload = {
        "email": "newaspirant@test.com",
        "password": "Password@123",
        "full_name": "New Aspirant",
        "role": "student",
        "target_exams": ["SSC CGL", "CHSL"],
        "preferred_subjects": ["Quantitative Aptitude"],
    }
    reg_resp = await client.post("/api/v1/auth/register", json=reg_payload)
    assert reg_resp.status_code == 201
    reg_data = reg_resp.json()
    assert reg_data["success"] is True
    assert reg_data["data"]["email"] == "newaspirant@test.com"

    # 2. Duplicate registration should return 409
    dup_resp = await client.post("/api/v1/auth/register", json=reg_payload)
    assert dup_resp.status_code == 409

    # 3. Login
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "newaspirant@test.com", "password": "Password@123"},
    )
    assert login_resp.status_code == 200
    login_data = login_resp.json()
    assert login_data["success"] is True
    token = login_data["data"]["tokens"]["access_token"]
    refresh_token = login_data["data"]["tokens"]["refresh_token"]
    assert token is not None

    # 4. Get Current User /me
    me_resp = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_resp.status_code == 200
    assert me_resp.json()["data"]["email"] == "newaspirant@test.com"

    # 5. Refresh token
    refresh_resp = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert refresh_resp.status_code == 200
    assert "access_token" in refresh_resp.json()["data"]


@pytest.mark.asyncio
async def test_remember_me_and_forgot_password(client: AsyncClient):
    # 1. Login with remember_me: true
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "student@gmail.com", "password": "student123", "remember_me": True},
    )
    assert login_resp.status_code == 200
    login_data = login_resp.json()
    assert login_data["success"] is True
    # 30 days = 2592000 seconds
    assert login_data["data"]["tokens"]["expires_in"] == 2592000

    # 2. Forgot password request
    forgot_resp = await client.post(
        "/api/v1/auth/forgot-password",
        json={"email": "student@gmail.com"},
    )
    assert forgot_resp.status_code == 200
    forgot_data = forgot_resp.json()
    assert forgot_data["success"] is True
    assert "reset_code" in forgot_data["data"]
    code = forgot_data["data"]["reset_code"]
    assert len(code) == 6

    # 3. Reset password with valid code
    reset_resp = await client.post(
        "/api/v1/auth/reset-password",
        json={"email": "student@gmail.com", "reset_code": code, "new_password": "NewStudentPassword@123"},
    )
    assert reset_resp.status_code == 200
    assert reset_resp.json()["success"] is True

    # 4. Verify login with new password
    new_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "student@gmail.com", "password": "NewStudentPassword@123"},
    )
    assert new_login.status_code == 200

    # 5. Restore original password for downstream compatibility
    forgot_resp2 = await client.post(
        "/api/v1/auth/forgot-password",
        json={"email": "student@gmail.com"},
    )
    code2 = forgot_resp2.json()["data"]["reset_code"]
    await client.post(
        "/api/v1/auth/reset-password",
        json={"email": "student@gmail.com", "reset_code": code2, "new_password": "student123"},
    )

