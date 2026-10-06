import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_courses_and_enrollment_flow(client: AsyncClient):
    # 1. Login as student
    student_login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "student@gmail.com", "password": "student123"},
    )
    assert student_login_resp.status_code == 200
    token = student_login_resp.json()["data"]["tokens"]["access_token"]
    student_headers = {"Authorization": f"Bearer {token}"}

    # 2. List courses (public/authenticated)
    courses_resp = await client.get("/api/v1/courses")
    assert courses_resp.status_code == 200
    courses = courses_resp.json()["data"]
    assert len(courses) >= 1
    c1 = courses[0]
    course_id = c1["id"]
    assert "original_price" in c1
    assert "discounted_price" in c1
    assert "total_quizzes" in c1
    assert "subjects" in c1

    # 3. Get Course Detail with subject-wise quizzes
    detail_resp = await client.get(f"/api/v1/courses/{course_id}", headers=student_headers)
    assert detail_resp.status_code == 200
    detail = detail_resp.json()["data"]
    assert detail["id"] == course_id
    assert len(detail["quizzes"]) >= 1
    # Check that quizzes have questions and detailed explanations
    quiz1 = detail["quizzes"][0]
    assert "title" in quiz1
    assert len(quiz1["questions"]) >= 1
    q1 = quiz1["questions"][0]
    assert "solution_explanation" in q1
    assert "correct_option" in q1

    # 4. Create Razorpay order for this course with GovCoin discount
    order_resp = await client.post(
        f"/api/v1/courses/{course_id}/create-order",
        headers=student_headers,
        json={"apply_coins": True},
    )
    assert order_resp.status_code == 200
    order_data = order_resp.json()["data"]
    assert "order_id" in order_data
    assert "amount_rupees" in order_data
    assert order_data["course_id"] == course_id

    # 5. Verify payment & enroll into the course
    verify_resp = await client.post(
        f"/api/v1/courses/{course_id}/verify-payment",
        headers=student_headers,
        json={
            "order_id": order_data["order_id"],
            "payment_id": f"pay_test_course_{course_id[:8]}",
            "signature": "mock_signature_test",
            "coins_used": order_data.get("coins_applied", 0),
        },
    )
    assert verify_resp.status_code == 200
    verify_data = verify_resp.json()["data"]
    assert verify_data["success"] is True
    assert verify_data["course_id"] == course_id

    # 6. Fetch user's enrolled courses dynamically from DB
    enrollments_resp = await client.get("/api/v1/courses/my-enrollments", headers=student_headers)
    assert enrollments_resp.status_code == 200
    enrolled = enrollments_resp.json()["data"]
    assert any(c["id"] == course_id for c in enrolled)
    enrolled_item = next(c for c in enrolled if c["id"] == course_id)
    assert "quizzes" in enrolled_item
    assert "subjects" in enrolled_item
    assert "total_quizzes" in enrolled_item
    assert "title" in enrolled_item

    # 7. Verify user profile schema has structured enrolled_courses objects
    me_resp = await client.get("/api/v1/auth/me", headers=student_headers)
    assert me_resp.status_code == 200
    user_profile = me_resp.json()["data"]["profile"]
    assert "enrolled_courses" in user_profile
    assert len(user_profile["enrolled_courses"]) >= 1
    stored_course = next(c for c in user_profile["enrolled_courses"] if c["course_id"] == course_id)
    assert stored_course["course_title"]
    assert stored_course["status"] == "ACTIVE"

    # 8. Test direct enrollment endpoint
    direct_enroll_resp = await client.post(f"/api/v1/courses/{course_id}/enroll", headers=student_headers)
    assert direct_enroll_resp.status_code == 200
    direct_data = direct_enroll_resp.json()["data"]
    assert direct_data["course_id"] == course_id
    assert direct_data["success"] is True
