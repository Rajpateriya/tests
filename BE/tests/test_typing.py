import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_typing_mock_test_and_analysis_flow(client: AsyncClient):
    # 1. Login as student
    student_login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "student@gmail.com", "password": "student123"},
    )
    assert student_login_resp.status_code == 200
    token = student_login_resp.json()["data"]["tokens"]["access_token"]
    student_headers = {"Authorization": f"Bearer {token}"}

    # 2. List typing passages
    passages_resp = await client.get("/api/v1/typing/passages")
    assert passages_resp.status_code == 200
    passages = passages_resp.json()["data"]
    assert len(passages) >= 1
    p1 = passages[0]
    passage_id = p1["id"]
    assert "target_wpm" in p1
    assert "duration_seconds" in p1

    # 3. Get Passage detail
    detail_resp = await client.get(f"/api/v1/typing/passages/{passage_id}")
    assert detail_resp.status_code == 200
    detail = detail_resp.json()["data"]
    assert detail["id"] == passage_id
    assert len(detail["content"]) > 10

    # 4. Submit typed test attempt
    words = detail["content"].split()
    typed_words = words[:25]
    typed_text = " ".join(typed_words)

    submit_payload = {
        "passage_id": passage_id,
        "typed_text": typed_text,
        "time_taken_seconds": 30.0,
        "backspace_count": 3,
        "total_keystrokes": len(typed_text),
    }

    submit_resp = await client.post(
        "/api/v1/typing/submit",
        headers=student_headers,
        json=submit_payload,
    )
    assert submit_resp.status_code == 200
    scorecard = submit_resp.json()["data"]
    assert "gross_wpm" in scorecard
    assert "net_wpm" in scorecard
    assert "accuracy_percentage" in scorecard
    assert "correct_keystrokes" in scorecard
    assert "wrong_keystrokes" in scorecard
    assert "is_qualified" in scorecard
    assert "qualification_reason" in scorecard
    assert scorecard["gross_wpm"] > 0
    assert scorecard["accuracy_percentage"] >= 90.0

    # 5. Check user's typing history and performance trends
    history_resp = await client.get("/api/v1/typing/my-history", headers=student_headers)
    assert history_resp.status_code == 200
    history_data = history_resp.json()["data"]
    assert history_data["total_tests"] >= 1
    assert len(history_data["attempts"]) >= 1
    assert history_data["best_wpm"] >= 0
