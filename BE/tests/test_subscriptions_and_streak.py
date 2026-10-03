import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_seed_logins_and_streak_subscription(client: AsyncClient):
    # 1. Test Admin Login with requested credentials admin@gmail.com / admin123
    admin_login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@gmail.com", "password": "admin123"},
    )
    assert admin_login_resp.status_code == 200
    admin_data = admin_login_resp.json()
    assert admin_data["success"] is True
    assert admin_data["data"]["user"]["role"] == "admin"
    assert admin_data["data"]["user"]["email"] == "admin@gmail.com"

    # 2. Test Student Login with requested credentials student@gmail.com / student123
    student_login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "student@gmail.com", "password": "student123"},
    )
    assert student_login_resp.status_code == 200
    student_data = student_login_resp.json()
    assert student_data["success"] is True
    assert student_data["data"]["user"]["role"] == "student"
    assert student_data["data"]["user"]["email"] == "student@gmail.com"
    token = student_data["data"]["tokens"]["access_token"]
    student_headers = {"Authorization": f"Bearer {token}"}

    # 3. Test Subscription Plans endpoint
    plans_resp = await client.get("/api/v1/subscriptions/plans")
    assert plans_resp.status_code == 200
    plans = plans_resp.json()["data"]
    assert len(plans) >= 3
    plan_ids = [p["id"] for p in plans]
    assert "PASS_7_DAYS" in plan_ids
    assert "PASS_MONTHLY" in plan_ids

    # 4. Test Streak data endpoint
    streak_resp = await client.get("/api/v1/streak/me", headers=student_headers)
    assert streak_resp.status_code == 200
    streak_data = streak_resp.json()["data"]
    assert "coins_balance" in streak_data
    assert "current_streak" in streak_data
    assert "timeline" in streak_data
    assert "heatmap" in streak_data

    # 5. Test Fetching Daily Quiz Questions (Auto-picked Easy, Medium, Hard from DB)
    q_resp = await client.get("/api/v1/streak/daily-quiz/questions?count=3", headers=student_headers)
    assert q_resp.status_code == 200
    questions = q_resp.json()["data"]
    assert len(questions) == 3
    q1 = questions[0]
    assert "id" in q1
    assert "difficulty" in q1
    assert "question_text" in q1
    assert "options" in q1

    # Test Verifying Answer for single question one by one
    ans_resp = await client.post(
        "/api/v1/streak/daily-quiz/verify-answer",
        headers=student_headers,
        json={"question_id": q1["id"], "selected_option": "A"},
    )
    assert ans_resp.status_code == 200
    ans_data = ans_resp.json()["data"]
    assert "is_correct" in ans_data
    assert "correct_option" in ans_data
    assert "solution_explanation" in ans_data

    # 6. Test Solving Daily Quiz
    quiz_resp = await client.post(
        "/api/v1/streak/daily-quiz/solve",
        headers=student_headers,
        json={"correct_count": 3, "total_count": 3},
    )
    assert quiz_resp.status_code == 200
    quiz_data = quiz_resp.json()["data"]
    assert quiz_data["success"] is True
    assert "coins_balance" in quiz_data

    # 6. Test Discount Calculation with Coins
    discount_resp = await client.post(
        "/api/v1/subscriptions/calculate-discount",
        headers=student_headers,
        json={"plan_id": "PASS_7_DAYS", "apply_coins": True},
    )
    assert discount_resp.status_code == 200
    disc_data = discount_resp.json()["data"]
    assert disc_data["coins_applied"] > 0
    assert disc_data["final_payable_amount"] < disc_data["base_price"]

    # 7. Test Order Creation
    order_resp = await client.post(
        "/api/v1/subscriptions/create-order",
        headers=student_headers,
        json={"plan_id": "PASS_7_DAYS", "apply_coins": True},
    )
    assert order_resp.status_code == 200
    order_data = order_resp.json()["data"]
    assert "order_id" in order_data
    order_id = order_data["order_id"]

    # 8. Test Payment Verification & Activation
    verify_resp = await client.post(
        "/api/v1/subscriptions/verify-payment",
        headers=student_headers,
        json={
            "order_id": order_id,
            "payment_id": "pay_test123456",
            "plan_id": "PASS_7_DAYS",
            "coins_used": disc_data["coins_applied"],
        },
    )
    assert verify_resp.status_code == 200
    verify_data = verify_resp.json()["data"]
    assert verify_data["success"] is True
    assert verify_data["subscription"]["status"] == "ACTIVE"
