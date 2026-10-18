# Live Classroom (Kelas Live) API tests - non-destructive (no lock/kick/end; never touches student2)
import os
import re
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')
CID = "95faa529-aa0f-487d-a32d-1a70158bc13c"
PW = "<LIVE_TEST_PASSWORD>"
U = {
    "math": "live.math.316d67@livetest.sch.id",
    "history": "live.history.316d67@livetest.sch.id",
    "outsider": "live.outsider.316d67@livetest.sch.id",
    "s1": "live.s1.316d67@livetest.sch.id",
    "s3": "live.s3.316d67@livetest.sch.id",
}
ADMIN = ("admin@sman1laguboti.sch.id", "<SUPER_ADMIN_PASSWORD>")


def login(email, pw=PW):
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": pw})
    if r.status_code != 200:
        pytest.skip(f"login failed {email}: {r.status_code} {r.text}")
    s.headers["Authorization"] = f"Bearer {r.json()['token']}"
    return s


@pytest.fixture(scope="module")
def math():
    return login(U["math"])


# State / lobby
class TestState:
    def test_math_state_host(self, math):
        r = math.get(f"{BASE_URL}/api/classes/{CID}/live/state")
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["my_role"] == "host"
        assert d["session"]["subject"].lower().startswith("matematika")
        assert d["can_join"] is True
        assert isinstance(d["schedule"], list) and len(d["schedule"]) >= 1
        assert d["media_available"] is False

    def test_student_state(self):
        s = login(U["s1"])
        d = s.get(f"{BASE_URL}/api/classes/{CID}/live/state").json()
        assert d["my_role"] == "student"

    def test_admin_monitor(self):
        s = login(*ADMIN)
        r = s.post(f"{BASE_URL}/api/classes/{CID}/live-token")
        assert r.status_code == 200, r.text
        assert r.json()["role"] == "monitor"


# Schedule enforcement
class TestAccess:
    @pytest.mark.parametrize("who", ["outsider", "history", "s3"])
    def test_forbidden(self, who):
        s = login(U[who])
        r = s.post(f"{BASE_URL}/api/classes/{CID}/live-token")
        assert r.status_code == 403, r.text

    def test_host_token_and_no_secret(self, math):
        r = math.post(f"{BASE_URL}/api/classes/{CID}/live-token")
        assert r.status_code == 200
        d = r.json()
        assert d["role"] == "host"
        txt = r.text.lower()
        assert "secret" not in txt and "api_key" not in txt
        env = open("/app/backend/.env").read()
        m = re.search(r"LIVEKIT_API_SECRET=\"?([^\"\n]+)", env)
        if m:
            assert m.group(1) not in r.text
        st = math.get(f"{BASE_URL}/api/classes/{CID}/live/state").text
        if m:
            assert m.group(1) not in st

    def test_host_tools_forbidden_for_student(self, math):
        sid = math.get(f"{BASE_URL}/api/classes/{CID}/live/state").json()["session"]["id"]
        s = login(U["s1"])
        for ep in ("mute-all", "extend", "end"):
            assert s.post(f"{BASE_URL}/api/live/{sid}/{ep}").status_code == 403
        assert s.post(f"{BASE_URL}/api/live/{sid}/lock", json={"locked": True}).status_code == 403


# Chat
class TestChat:
    def test_chat_send_and_list(self, math):
        sid = math.get(f"{BASE_URL}/api/classes/{CID}/live/state").json()["session"]["id"]
        r = math.post(f"{BASE_URL}/api/live/{sid}/chat", json={"text": "TEST_api pesan", "announcement": True})
        assert r.status_code == 200
        assert r.json()["announcement"] is True
        s = login(U["s1"])
        r2 = s.post(f"{BASE_URL}/api/live/{sid}/chat", json={"text": "TEST_student ann", "announcement": True})
        assert r2.status_code == 200 and r2.json()["announcement"] is False
        lst = s.get(f"{BASE_URL}/api/live/{sid}/chat").json()
        assert any(m["text"] == "TEST_api pesan" for m in lst)
        assert all("_id" not in m for m in lst)

    def test_chat_empty_rejected(self, math):
        sid = math.get(f"{BASE_URL}/api/classes/{CID}/live/state").json()["session"]["id"]
        assert math.post(f"{BASE_URL}/api/live/{sid}/chat", json={"text": ""}).status_code == 422

    def test_outsider_chat_forbidden(self, math):
        sid = math.get(f"{BASE_URL}/api/classes/{CID}/live/state").json()["session"]["id"]
        s = login(U["outsider"])
        assert s.get(f"{BASE_URL}/api/live/{sid}/chat").status_code == 403
