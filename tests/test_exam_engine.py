import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_test_discovery_and_exam_flow(client: AsyncClient, auth_student_headers: dict):
    # 1. Discover available tests
    tests_resp = await client.get("/api/v1/tests", headers=auth_student_headers)
    assert tests_resp.status_code == 200
    tests = tests_resp.json()["data"]
    assert len(tests) > 0
    test_id = tests[0]["id"]

    # 2. Start an exam attempt
    start_resp = await client.post(f"/api/v1/tests/{test_id}/start", headers=auth_student_headers)
    assert start_resp.status_code == 201
    start_data = start_resp.json()["data"]
    attempt_id = start_data["attempt_id"]
    assert attempt_id is not None
    assert start_data["remaining_seconds"] > 0

    # 3. Fetch questions in active exam room (ensure correct answers are hidden!)
    q_resp = await client.get(f"/api/v1/attempts/{attempt_id}/questions", headers=auth_student_headers)
    assert q_resp.status_code == 200
    exam_state = q_resp.json()["data"]
    questions = exam_state["questions"]
    assert len(questions) > 0

    # Verify Anti-Cheat: neither correct_option nor solution_explanation are in the public question payload!
    for q in questions:
        assert "correct_option" not in q
        assert "solution_explanation" not in q

    # 4. Sync heartbeat / answers & palette
    q1_id = questions[0]["id"]
    sync_payload = {
        "current_question_index": 1,
        "palette_states": {
            q1_id: "ANSWERED"
        },
        "answers": {
            q1_id: "B"
        },
        "time_spent_per_question": {
            q1_id: 35
        },
        "tab_switch_count": 0,
    }
    sync_resp = await client.post(
        f"/api/v1/attempts/{attempt_id}/sync",
        json=sync_payload,
        headers=auth_student_headers,
    )
    assert sync_resp.status_code == 200
    assert sync_resp.json()["data"]["is_expired"] is False

    # 5. Resume attempt (fetching questions again should reflect synced answers)
    resume_resp = await client.get(f"/api/v1/attempts/{attempt_id}/questions", headers=auth_student_headers)
    assert resume_resp.status_code == 200
    resumed_state = resume_resp.json()["data"]
    assert resumed_state["answers"].get(q1_id) == "B"
    assert resumed_state["time_spent_per_question"].get(q1_id) == 35
