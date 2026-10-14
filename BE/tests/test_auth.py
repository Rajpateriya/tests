import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_and_login(client: AsyncClient):
    # 1. Register new user (stages pending registration, generates OTP, does NOT create user in DB yet)
    reg_payload = {
        "email": "newaspirant@test.com",
        "password": "Password@123",
        "full_name": "New Aspirant",
        "target_exams": ["SSC CGL", "CHSL"],
        "preferred_subjects": ["Quantitative Aptitude"],
    }
    reg_resp = await client.post("/api/v1/auth/register", json=reg_payload)
    assert reg_resp.status_code == 200
    reg_data = reg_resp.json()
    assert reg_data["success"] is True
    assert reg_data["data"]["email"] == "newaspirant@test.com"
    otp = reg_data["data"]["otp"]
    assert otp is not None
    assert len(otp) == 6

    # 2. Before OTP verification, user MUST NOT be able to log in
    premature_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "newaspirant@test.com", "password": "Password@123"},
    )
    assert premature_login.status_code == 401

    # 3. Incorrect OTP verification should fail with 401 and not create user
    wrong_otp_resp = await client.post(
        "/api/v1/auth/verify-otp",
        json={"email": "newaspirant@test.com", "otp": "000000"},
    )
    assert wrong_otp_resp.status_code == 401

    # 4. Resend OTP should generate a fresh OTP
    resend_resp = await client.post(
        "/api/v1/auth/send-otp",
        json={"email": "newaspirant@test.com"},
    )
    assert resend_resp.status_code == 200
    new_otp = resend_resp.json()["data"]["otp"]
    assert new_otp is not None
    assert len(new_otp) == 6

    # 5. Verify OTP with the fresh OTP -> user created in database
    verify_resp = await client.post(
        "/api/v1/auth/verify-otp",
        json={"email": "newaspirant@test.com", "otp": new_otp},
    )
    assert verify_resp.status_code == 200
    user_data = verify_resp.json()["data"]
    assert user_data["email"] == "newaspirant@test.com"
    assert user_data["role"] == "user"

    # 6. Duplicate registration for already created user should return 409 Conflict
    dup_resp = await client.post("/api/v1/auth/register", json=reg_payload)
    assert dup_resp.status_code == 409

    # 7. Login after OTP verification succeeds
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

    # 8. Get Current User /me
    me_resp = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_resp.status_code == 200
    assert me_resp.json()["data"]["email"] == "newaspirant@test.com"

    # 9. Refresh token
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


@pytest.mark.asyncio
async def test_role_enforcement_and_rbac(client: AsyncClient):
    # 1. Attempt registering with role="admin" -> MUST still be assigned "user" upon OTP verification
    malicious_reg = {
        "email": "hacker@test.com",
        "password": "Password@123",
        "full_name": "Wannabe Admin",
        "role": "admin",
    }
    reg_resp = await client.post("/api/v1/auth/register", json=malicious_reg)
    assert reg_resp.status_code == 200
    otp = reg_resp.json()["data"]["otp"]

    verify_resp = await client.post(
        "/api/v1/auth/verify-otp",
        json={"email": "hacker@test.com", "otp": otp},
    )
    assert verify_resp.status_code == 200
    assert verify_resp.json()["data"]["role"] == "user"

    # 2. Login returns trusted backend role "user"
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "hacker@test.com", "password": "Password@123"},
    )
    assert login_resp.status_code == 200
    user_data = login_resp.json()["data"]["user"]
    token = login_resp.json()["data"]["tokens"]["access_token"]
    assert user_data["role"] == "user"

    # 3. User cannot access admin routes (403 Forbidden)
    admin_access = await client.get("/api/v1/admin/users", headers={"Authorization": f"Bearer {token}"})
    assert admin_access.status_code == 403

    # 4. User cannot modify role via profile update
    profile_update = await client.put(
        "/api/v1/users/profile",
        json={"full_name": "Updated Name", "role": "admin"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert profile_update.status_code == 200
    # Role remains user
    assert profile_update.json()["data"]["role"] == "user"


@pytest.mark.asyncio
async def test_otp_attempt_limits_and_re_registration(client: AsyncClient):
    """Ensure max attempts are enforced, pending record cleaned up, and user can register again."""
    email = "retryuser@test.com"
    payload = {
        "email": email,
        "password": "Password@123",
        "full_name": "Retry Candidate",
    }

    # Step 1: Register
    reg_resp = await client.post("/api/v1/auth/register", json=payload)
    assert reg_resp.status_code == 200

    # Step 2: Fail OTP 5 times
    for _ in range(4):
        fail_resp = await client.post("/api/v1/auth/verify-otp", json={"email": email, "otp": "999999"})
        assert fail_resp.status_code == 401

    # 5th attempt exceeds limit
    fifth_fail = await client.post("/api/v1/auth/verify-otp", json={"email": email, "otp": "999999"})
    assert fifth_fail.status_code in (400, 401)

    # Subsequent verification fails because pending registration was purged
    subsequent = await client.post("/api/v1/auth/verify-otp", json={"email": email, "otp": "999999"})
    assert subsequent.status_code == 400

    # Step 3: Candidate can cleanly re-register with the same email
    re_reg_resp = await client.post("/api/v1/auth/register", json=payload)
    assert re_reg_resp.status_code == 200
    new_otp = re_reg_resp.json()["data"]["otp"]

    # Step 4: Verify with correct OTP succeeds
    verify_resp = await client.post("/api/v1/auth/verify-otp", json={"email": email, "otp": new_otp})
    assert verify_resp.status_code == 200
    assert verify_resp.json()["data"]["email"] == email
