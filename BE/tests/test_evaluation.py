import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_test_submission_and_deep_analytics(client: AsyncClient, auth_student_headers: dict):
    # 1. Get tests
    tests_resp = await client.get("/api/v1/tests?test_type=TOPIC_MINI", headers=auth_student_headers)
    assert tests_resp.status_code == 200
    tests = tests_resp.json()["data"]
    assert len(tests) > 0
    test_id = tests[0]["id"]

    # 2. Start attempt
    start_resp = await client.post(f"/api/v1/tests/{test_id}/start", headers=auth_student_headers)
    attempt_id = start_resp.json()["data"]["attempt_id"]

    # 3. Get questions
    q_resp = await client.get(f"/api/v1/attempts/{attempt_id}/questions", headers=auth_student_headers)
    questions = q_resp.json()["data"]["questions"]
    q1_id = questions[0]["id"]

    # 4. Final submit with one answer chosen
    submit_resp = await client.post(
        f"/api/v1/attempts/{attempt_id}/submit",
        json={
            "answers": {q1_id: "B"},
            "time_spent_per_question": {q1_id: 42},
        },
        headers=auth_student_headers,
    )
    assert submit_resp.status_code == 200
    res_data = submit_resp.json()["data"]
    assert res_data["status"] == "COMPLETED"
    assert "total_score" in res_data
    assert "accuracy_percentage" in res_data

    # 5. Fetch score card
    result_card = await client.get(f"/api/v1/results/{attempt_id}", headers=auth_student_headers)
    assert result_card.status_code == 200
    assert result_card.json()["data"]["attempt_id"] == attempt_id

    # 6. Fetch deep insights (Topic & Subject breakdowns, peer percentiles, weak/strong areas)
    insights_resp = await client.get(f"/api/v1/results/{attempt_id}/insights", headers=auth_student_headers)
    assert insights_resp.status_code == 200
    insights = insights_resp.json()["data"]
    assert "topic_analysis" in insights
    assert "subject_analysis" in insights
    assert "percentile" in insights
    assert "questions_breakdown" in insights
    # After submission, questions_breakdown reveals solutions and explanations
    assert "solution_explanation" in insights["questions_breakdown"][0]

    # 7. Check user dashboard
    user_me = await client.get("/api/v1/auth/me", headers=auth_student_headers)
    user_id = user_me.json()["data"]["id"]
    dash_resp = await client.get(f"/api/v1/users/{user_id}/dashboard", headers=auth_student_headers)
    assert dash_resp.status_code == 200
    dash_data = dash_resp.json()["data"]
    assert dash_data["total_mocks_attempted"] >= 1
