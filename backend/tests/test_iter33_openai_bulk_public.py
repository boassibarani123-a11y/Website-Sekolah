"""Iter33: Verify (a) OpenAI graceful disable, (b) SMTP graceful disable,
(c) /api/quizzes/parse-file CSV+XLSX, (d) /api/public/gallery-file public access,
(e) GET /api/settings exposes gallery_images."""
import io
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://edu-portal-956.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "boassibarani123@gmail.com"
ADMIN_PASSWORD = "Boas12345io"


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=20)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    return s


# ----- (a) Public settings endpoint has gallery_images field -----
def test_public_settings_has_gallery_images():
    r = requests.get(f"{API}/settings", timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert "gallery_images" in data
    assert isinstance(data["gallery_images"], list)


# ----- (b) AI graceful disable -----
def test_ai_quiz_generate_graceful_disable(admin_session):
    r = admin_session.post(f"{API}/ai/quiz-generate",
                           json={"topic": "Matematika", "count": 3, "kelas": "X"},
                           timeout=30)
    # Expect HTTPException(400) with Indonesian message about OPENAI_API_KEY
    assert r.status_code == 400, f"expected 400, got {r.status_code}: {r.text}"
    msg = (r.json().get("detail") or "").lower()
    assert "openai" in msg or "ai" in msg, f"unexpected message: {msg}"


# ----- (c) SMTP graceful disable -----
def test_forgot_password_graceful():
    r = requests.post(f"{API}/auth/forgot-password",
                      json={"email": "nobody-TEST@example.com"},
                      timeout=15)
    assert r.status_code == 200
    assert "message" in r.json()


# ----- (d) Bulk quiz parse: CSV header mapping + answer normalization -----
def test_parse_file_csv_answer_normalization(admin_session):
    csv_text = (
        "Pertanyaan,Opsi A,Opsi B,Opsi C,Opsi D,Jawaban\n"
        "Ibu kota Indonesia?,Jakarta,Bandung,Surabaya,Medan,A\n"
        "2+2=?,1,2,3,4,4\n"
        "Benua terbesar?,Afrika,Asia,Eropa,Amerika,Asia\n"
        "Pilih huruf,A1,A2,A3,A4,B\n"
    )
    files = {"file": ("quiz.csv", csv_text.encode("utf-8"), "text/csv")}
    r = admin_session.post(f"{API}/quizzes/parse-file", files=files, timeout=20)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["count"] == 4
    qs = data["questions"]
    # Row 1: Jawaban 'A' -> 0 (Jakarta)
    assert qs[0]["answer"] == 0
    assert qs[0]["options"][0] == "Jakarta"
    # Row 2: options ['1','2','3','4'] answer '4' -> opts.index('4') == 3 (preferred over 1-based)
    assert qs[1]["options"] == ["1", "2", "3", "4"]
    assert qs[1]["answer"] == 3, f"expected 3 (text match '4'), got {qs[1]['answer']}"
    # Row 3: text match 'Asia' -> 1
    assert qs[2]["answer"] == 1
    # Row 4: letter 'B' -> 1
    assert qs[3]["answer"] == 1


def test_parse_file_xlsx(admin_session):
    import openpyxl
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append(["Pertanyaan", "Opsi A", "Opsi B", "Opsi C", "Opsi D", "Jawaban"])
    ws.append(["Ibu kota Jepang?", "Tokyo", "Seoul", "Beijing", "Hanoi", "A"])
    ws.append(["Warna langit?", "Merah", "Biru", "Hijau", "Kuning", "Biru"])
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    files = {"file": ("quiz.xlsx", buf.read(),
                      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    r = admin_session.post(f"{API}/quizzes/parse-file", files=files, timeout=20)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["count"] == 2
    assert data["questions"][0]["answer"] == 0
    assert data["questions"][1]["answer"] == 1


def test_parse_file_invalid_rejected(admin_session):
    files = {"file": ("quiz.csv", b"", "text/csv")}
    r = admin_session.post(f"{API}/quizzes/parse-file", files=files, timeout=15)
    assert r.status_code == 400


# ----- (e) Public gallery file endpoint -----
def test_public_gallery_file_flow(admin_session):
    # 1x1 PNG
    png = (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
        b"\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\xcf"
        b"\xc0\x00\x00\x00\x03\x00\x01\x5b\xb6\xee\x56\x00\x00\x00\x00IEND\xaeB`\x82"
    )
    up = admin_session.post(f"{API}/upload", files={"file": ("test_gallery.png", png, "image/png")}, timeout=20)
    assert up.status_code == 200, up.text
    url = up.json().get("url") or up.json().get("file_url")
    assert url and "/api/files/" in url
    path = url.split("/api/files/")[-1]

    # Before appending to settings - public endpoint must 404 (not in allowed set)
    r_before = requests.get(f"{BASE_URL}{url.replace('/api/files/', '/api/public/gallery-file/')}", timeout=15)
    # Could also be 404 if cleanup from prior test; we assert 404 (not referenced)
    assert r_before.status_code == 404

    # Append to settings.gallery_images
    cur = admin_session.get(f"{API}/settings", timeout=15).json()
    original = list(cur.get("gallery_images") or [])
    new_gallery = original + [url]
    patch = admin_session.patch(f"{API}/settings", json={"gallery_images": new_gallery}, timeout=15)
    assert patch.status_code == 200, patch.text

    try:
        # Public endpoint should now serve the file WITHOUT auth
        pub_url = f"{API}/public/gallery-file/{path}"
        r_pub = requests.get(pub_url, timeout=15)
        assert r_pub.status_code == 200, f"public gallery fetch failed: {r_pub.status_code}"
        assert r_pub.content[:8] == b"\x89PNG\r\n\x1a\n"
    finally:
        # Cleanup: remove from gallery_images
        admin_session.patch(f"{API}/settings", json={"gallery_images": original}, timeout=15)
