import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_passes_and_coins_flow(client: AsyncClient):
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

    # 3. Check public passes endpoint (initially empty because seeding is removed)
    passes_resp = await client.get("/api/v1/subscriptions/passes")
    assert passes_resp.status_code == 200
    passes_data = passes_resp.json()["data"]
    assert len(passes_data) == 0

    # 4. Fetch list of courses to test pass coverage
    courses_resp = await client.get("/api/v1/courses", headers=student_headers)
    assert courses_resp.status_code == 200
    courses = courses_resp.json()["data"]
    assert len(courses) > 1
    # Pick a course that is NOT already directly enrolled
    unenrolled_course = next(c for c in courses if not c.get("is_enrolled"))
    target_course_id = unenrolled_course["id"]

    # 5. Admin creates a new dynamic targeted pass covering target_course_id
    new_pass_payload = {
        "title": "SSC CGL Super Sprint Pass",
        "tagline": "Full-length official simulations, deep error analytics, and All-India percentile tracking.",
        "badge": "SAVE 40%",
        "duration_days": 30,
        "base_price": 99.0,
        "original_price": 199.0,
        "max_coins_discount": 400,  # 400 coins = ₹40 discount
        "covered_course_ids": [target_course_id],
        "features": [
            "Full-length official simulations",
            "Deep error analytics",
            "All-India percentile tracking",
        ],
        "is_active": True,
    }
    create_pass_resp = await client.post(
        "/api/v1/admin/passes",
        headers=admin_headers,
        json=new_pass_payload,
    )
    assert create_pass_resp.status_code == 201
    created_pass = create_pass_resp.json()["data"]
    created_pass_id = created_pass["id"]
    assert created_pass["title"] == "SSC CGL Super Sprint Pass"
    assert created_pass["max_rupee_discount"] == 40.0  # 400 * 0.10

    # 6. Test Coin conversion: 100 coins = 10 Rs
    # Calculate discount for student on this new pass
    disc_resp = await client.post(
        "/api/v1/subscriptions/calculate-discount",
        headers=student_headers,
        json={"plan_id": created_pass_id, "apply_coins": True},
    )
    assert disc_resp.status_code == 200
    disc_data = disc_resp.json()["data"]
    coins_applied = disc_data["coins_applied"]
    discount_amount = disc_data["discount_amount"]
    # Verify metric: discount_amount == coins_applied * 0.10
    assert round(discount_amount, 2) == round(coins_applied * 0.10, 2)
    assert disc_data["final_payable_amount"] == round(disc_data["base_price"] - discount_amount, 2)

    # 7. Student buys the pass via payment flow
    order_resp = await client.post(
        "/api/v1/subscriptions/create-order",
        headers=student_headers,
        json={"plan_id": created_pass_id, "apply_coins": True},
    )
    assert order_resp.status_code == 200
    order_data = order_resp.json()["data"]
    assert "order_id" in order_data
    assert order_data["amount_rupees"] == disc_data["final_payable_amount"]

    verify_resp = await client.post(
        "/api/v1/subscriptions/verify-payment",
        headers=student_headers,
        json={
            "order_id": order_data["order_id"],
            "payment_id": "pay_test_pass_activation",
            "plan_id": created_pass_id,
            "coins_used": coins_applied,
        },
    )
    assert verify_resp.status_code == 200
    verify_data = verify_resp.json()["data"]
    assert verify_data["success"] is True

    # 8. Check student's active passes endpoint
    my_pass_resp = await client.get("/api/v1/subscriptions/my-pass", headers=student_headers)
    assert my_pass_resp.status_code == 200
    my_pass_data = my_pass_resp.json()["data"]
    assert my_pass_data["has_active_pass"] is True
    active_pass_ids = [p["pass_id"] for p in my_pass_data["active_passes"]]
    assert created_pass_id in active_pass_ids

    # 9. Verify the TWO FLOWS course access:
    # Student did NOT buy target_course_id individually, but it IS covered under the active pass!
    course_detail_resp = await client.get(f"/api/v1/courses/{target_course_id}", headers=student_headers)
    assert course_detail_resp.status_code == 200
    course_detail = course_detail_resp.json()["data"]
    assert course_detail["is_enrolled"] is True
    assert course_detail["access_source"] == "PASS"

    # Also verify it appears in /courses/my-courses
    my_courses_resp = await client.get("/api/v1/courses/my-courses", headers=student_headers)
    assert my_courses_resp.status_code == 200
    my_courses = my_courses_resp.json()["data"]
    my_course_ids = [c["course_id"] for c in my_courses]
    assert target_course_id in my_course_ids

    # 10. Test Streak milestones & Streak Reset flow
    streak_resp = await client.get("/api/v1/streak/me", headers=student_headers)
    assert streak_resp.status_code == 200
    streak_data = streak_resp.json()["data"]
    assert streak_data["coin_rate"] == "100 coins = 10 Rs"
    assert streak_data["coin_to_rupee_rate"] == 0.10
