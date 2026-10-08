"""Iter32: Quiz answer-index locking + SchoolInfo gallery/upload backend tests."""
import os, io, uuid, requests, pytest

BASE = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") + "/api"
ADMIN = {"email": "boassibarani123@gmail.com", "password": "Boas12345io"}
TAG = f"ITER32_{uuid.uuid4().hex[:6]}"


def _h(t): return {"Authorization": f"Bearer {t}"}


def _login(email, password):
    r = requests.post(f"{BASE}/auth/login", json={"email": email, "password": password}, timeout=20)
    assert r.status_code == 200, (email, r.status_code, r.text)
    return r.json()["token"]


@pytest.fixture(scope="module")
def ctx():
    admin = _login(**ADMIN)
    cname = f"TEST_{TAG}_K"
    r = requests.post(f"{BASE}/classes", headers=_h(admin),
                      json={"name": cname, "subjects": ["Matematika"]}, timeout=10)
    assert r.status_code in (200, 201), r.text
    cls = r.json()
    siswa_email = f"test_siswa_{TAG.lower()}@sma.id"
    s = requests.post(f"{BASE}/users", headers=_h(admin), json={
        "email": siswa_email, "password": "Siswa12345", "name": f"TEST Siswa {TAG}",
        "role": "siswa", "kelas": cls["name"], "nisn": f"999{uuid.uuid4().hex[:7]}",
        "phone": "081234500000"}, timeout=10)
    assert s.status_code == 200, s.text
    siswa_tok = _login(siswa_email, "Siswa12345")
    created_quiz_ids = []
    created_exam_ids = []
    data = {"admin": admin, "class_id": cls["id"], "class_name": cls["name"],
            "siswa_tok": siswa_tok, "siswa_id": s.json()["id"], "siswa_email": siswa_email,
            "quizzes": created_quiz_ids, "exams": created_exam_ids}
    yield data
    # teardown
    for qid in created_quiz_ids:
        requests.delete(f"{BASE}/quizzes/{qid}", headers=_h(admin), timeout=10)
    for eid in created_exam_ids:
        requests.delete(f"{BASE}/exams/{eid}", headers=_h(admin), timeout=10)
    requests.delete(f"{BASE}/users/{s.json()['id']}", headers=_h(admin), timeout=10)
    requests.delete(f"{BASE}/classes/{cls['id']}", headers=_h(admin), timeout=10)


# ---------------- Quiz answer-index normalization ----------------
def test_quiz_answer_text_normalized_to_index(ctx):
    payload = {
        "title": f"TEST_{TAG}_quiz_text",
        "kelas": ctx["class_name"], "class_id": ctx["class_id"], "subject": "Matematika",
        "questions": [{
            "q": "Ibu kota Indonesia?",
            "options": ["Bandung", "Jakarta", "Medan", "Bali"],
            "answer": "Jakarta",
        }],
    }
    r = requests.post(f"{BASE}/quizzes", headers=_h(ctx["admin"]), json=payload, timeout=10)
    assert r.status_code == 200, r.text
    qz = r.json(); ctx["quizzes"].append(qz["id"])
    # GET the quiz to verify stored int index
    g = requests.get(f"{BASE}/quizzes", headers=_h(ctx["admin"]), timeout=10)
    assert g.status_code == 200
    stored = next(x for x in g.json() if x["id"] == qz["id"])
    assert stored["questions"][0]["answer"] == 1
    assert isinstance(stored["questions"][0]["answer"], int)


def test_quiz_answer_out_of_range_rejected(ctx):
    payload = {
        "title": f"TEST_{TAG}_bad_idx", "kelas": ctx["class_name"], "class_id": ctx["class_id"],
        "subject": "Matematika",
        "questions": [{"q": "A?", "options": ["x", "y"], "answer": 5}],
    }
    r = requests.post(f"{BASE}/quizzes", headers=_h(ctx["admin"]), json=payload, timeout=10)
    assert r.status_code == 422, r.text


def test_quiz_too_few_options_rejected(ctx):
    payload = {
        "title": f"TEST_{TAG}_few", "kelas": ctx["class_name"], "class_id": ctx["class_id"],
        "subject": "Matematika",
        "questions": [{"q": "A?", "options": ["only"], "answer": 0}],
    }
    r = requests.post(f"{BASE}/quizzes", headers=_h(ctx["admin"]), json=payload, timeout=10)
    assert r.status_code == 422, r.text


def test_quiz_end_to_end_scoring_100(ctx):
    # NOTE: avoid digit-string option texts here because the `_normalize` validator
    # prefers isdigit->int(s) over `s in opts` lookup (see bug test below).
    questions = [
        {"q": "Dua tambah dua?", "options": ["tiga", "empat", "lima", "enam"], "answer": "empat"},  # idx 1
        {"q": "Warna langit?", "options": ["merah", "biru", "hijau"], "answer": "biru"},            # idx 1
        {"q": "Pulau terbesar RI?", "options": ["Jawa", "Sumatera", "Kalimantan", "Papua"], "answer": 2},
    ]
    payload = {"title": f"TEST_{TAG}_e2e", "kelas": ctx["class_name"],
               "class_id": ctx["class_id"], "subject": "Matematika", "questions": questions}
    r = requests.post(f"{BASE}/quizzes", headers=_h(ctx["admin"]), json=payload, timeout=10)
    assert r.status_code == 200, r.text
    qz = r.json(); ctx["quizzes"].append(qz["id"])
    qid = qz["id"]

    r2 = requests.post(f"{BASE}/quizzes/{qid}/start", headers=_h(ctx["siswa_tok"]), timeout=10)
    assert r2.status_code == 200, r2.text
    sq = r2.json()["questions"]
    assert len(sq) == 3

    orig_text = {questions[0]["q"]: "empat", questions[1]["q"]: "biru", questions[2]["q"]: "Kalimantan"}
    answers = [shq["options"].index(orig_text[shq["q"]]) for shq in sq]

    r3 = requests.post(f"{BASE}/quizzes/attempt", headers=_h(ctx["siswa_tok"]),
                       json={"quiz_id": qid, "answers": answers}, timeout=10)
    assert r3.status_code == 200, r3.text
    result = r3.json()
    assert result["score"] == 3, result
    assert result["total"] == 3
    assert result["percent"] == 100.0


def test_quiz_digit_option_text_normalizes_correctly(ctx):
    """BUG REPRO: options=['1','2','3','4'], answer='2' should normalize to idx 1
    (the position of the text '2'), NOT to int(2)=idx 2 which is '3'."""
    payload = {
        "title": f"TEST_{TAG}_digit",
        "kelas": ctx["class_name"], "class_id": ctx["class_id"], "subject": "Matematika",
        "questions": [{"q": "Mana angka dua?", "options": ["1", "2", "3", "4"], "answer": "2"}],
    }
    r = requests.post(f"{BASE}/quizzes", headers=_h(ctx["admin"]), json=payload, timeout=10)
    assert r.status_code == 200, r.text
    qz = r.json(); ctx["quizzes"].append(qz["id"])
    g = requests.get(f"{BASE}/quizzes", headers=_h(ctx["admin"]), timeout=10).json()
    stored = next(x for x in g if x["id"] == qz["id"])
    # The CORRECT answer index for text "2" in options ['1','2','3','4'] is 1.
    assert stored["questions"][0]["answer"] == 1, (
        f"BUG: digit-looking option text '2' was interpreted as index int('2')=2 "
        f"instead of options.index('2')=1. Got {stored['questions'][0]['answer']}")


# ---------------- Exam parity ----------------
def test_exam_answer_text_normalized(ctx):
    payload = {
        "title": f"TEST_{TAG}_exam",
        "kelas": ctx["class_name"], "class_id": ctx["class_id"], "subject": "Matematika",
        "password": "exam123",
        "questions": [{"q": "Ibu kota?", "options": ["Bandung", "Jakarta"], "answer": "Jakarta"}],
    }
    r = requests.post(f"{BASE}/exams", headers=_h(ctx["admin"]), json=payload, timeout=10)
    assert r.status_code == 200, r.text
    ex = r.json(); ctx["exams"].append(ex["id"])
    # admin fetch list to see stored answer
    g = requests.get(f"{BASE}/exams", headers=_h(ctx["admin"]), timeout=10)
    stored = next(x for x in g.json() if x["id"] == ex["id"])
    assert stored["questions"][0]["answer"] == 1


def test_exam_bad_answer_rejected(ctx):
    payload = {
        "title": f"TEST_{TAG}_exam_bad",
        "kelas": ctx["class_name"], "class_id": ctx["class_id"], "subject": "Matematika",
        "password": "exam123",
        "questions": [{"q": "A?", "options": ["x", "y"], "answer": 9}],
    }
    r = requests.post(f"{BASE}/exams", headers=_h(ctx["admin"]), json=payload, timeout=10)
    assert r.status_code == 422, r.text


# ---------------- Upload + Gallery persistence ----------------
# 1x1 PNG
PNG = bytes.fromhex(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489"
    "0000000d49444154789c6300010000000500010d0a2db40000000049454e44ae426082"
)


def test_upload_and_gallery_persist(ctx):
    admin = ctx["admin"]
    files = {"file": (f"TEST_{TAG}.png", io.BytesIO(PNG), "image/png")}
    r = requests.post(f"{BASE}/upload", headers=_h(admin), files=files, timeout=20)
    assert r.status_code == 200, r.text
    up = r.json()
    assert "url" in up and up["url"].startswith("/api/files/")

    # Save original gallery to restore later
    orig = requests.get(f"{BASE}/settings", timeout=10).json().get("gallery_images") or []

    # Append uploaded url via PATCH
    new_gallery = orig + [up["url"]]
    p = requests.patch(f"{BASE}/settings", headers=_h(admin),
                       json={"gallery_images": new_gallery}, timeout=10)
    assert p.status_code == 200, p.text
    assert up["url"] in (p.json().get("gallery_images") or [])

    # Verify public GET also returns it
    g = requests.get(f"{BASE}/settings", timeout=10).json()
    assert up["url"] in (g.get("gallery_images") or [])

    # Restore (reset to [] as instructed) - but preserve original if non-test
    reset = [u for u in orig if "TEST_" not in u]
    requests.patch(f"{BASE}/settings", headers=_h(admin),
                   json={"gallery_images": reset}, timeout=10)
