"""Idempotent seed of test accounts, class, bank soal and piket shifts for preview testing."""
import asyncio, os, uuid
from datetime import datetime, timezone, timedelta
import bcrypt
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(os.path.join(os.path.dirname(__file__), "..", "backend", ".env"))
db = AsyncIOMotorClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]
WIB = timezone(timedelta(hours=7))
now = lambda: datetime.now(timezone.utc).isoformat()
hp = lambda p: bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()

USERS = [
    {"email": "guru.test@sman1laguboti.sch.id", "name": "Guru Uji", "role": "guru", "nip": "198001012005011234", "subjects": ["Matematika"]},
    {"email": "siswa.test@sman1laguboti.sch.id", "name": "Siswa Uji", "role": "siswa", "nisn": "0081111111", "nis": "26100", "kelas": "XII IPA 1", "jurusan": "IPA"},
    {"email": "satpam.test@sman1laguboti.sch.id", "name": "Admin Absensi Uji", "role": "admin_absensi"},
]
PW = {"guru": "Guru12345", "siswa": "Siswa12345", "admin_absensi": "Absen12345"}


async def main():
    ids = {}
    for u in USERS:
        ex = await db.users.find_one({"email": u["email"]})
        if ex:
            ids[u["role"]] = ex["id"]
            continue
        uid = str(uuid.uuid4())
        await db.users.insert_one({"id": uid, **u, "password_hash": hp(PW[u["role"]]), "is_active": True, "is_demo": False,
                                   "qr_code": f"SEKOLAHKU-{uid}", "created_at": now()})
        ids[u["role"]] = uid
    if not await db.classes.find_one({"name": "XII IPA 1"}):
        await db.classes.insert_one({"id": str(uuid.uuid4()), "name": "XII IPA 1", "jurusan": "IPA", "homeroom_teacher_id": ids["guru"],
                                     "subjects": ["Matematika", "Fisika"], "created_at": now()})
    if not await db.question_bank.count_documents({"owner_id": ids["guru"]}):
        docs = []
        for lvl, n, p in (("Mudah", 6, 0.82), ("Sedang", 6, 0.55), ("Sukar", 4, 0.2)):
            for i in range(n):
                docs.append({"id": str(uuid.uuid4()), "owner_id": ids["guru"], "owner_name": "Guru Uji", "subject": "Matematika",
                             "kelas": "XII IPA 1", "type": "mc", "q": f"[{lvl}] Soal Matematika nomor {i + 1}: berapakah {i + 2} x {i + 3}?",
                             "options": [str((i + 2) * (i + 3)), str((i + 2) * (i + 3) + 1), str((i + 2) * (i + 3) - 1), "0"], "answer": 0,
                             "source_exam_title": "Seed", "difficulty": p, "difficulty_label": lvl,
                             "discrimination": 0.1 if i == 0 else 0.4, "discrimination_label": "Jelek" if i == 0 else "Baik",
                             "responses": 30, "used_count": 0, "created_at": now()})
        await db.question_bank.insert_many(docs)
    today = datetime.now(WIB).date()
    for d, st, et in ((today, "06:30", "12:00"), (today, "12:00", "16:00"), (today + timedelta(days=1), "06:30", "12:00")):
        if not await db.piket_shifts.find_one({"teacher_id": ids["guru"], "date": d.isoformat(), "start_time": st}):
            await db.piket_shifts.insert_one({"id": str(uuid.uuid4()), "teacher_id": ids["guru"], "teacher_name": "Guru Uji", "teacher_photo": None,
                                              "date": d.isoformat(), "start_time": st, "end_time": et, "gate": "Gerbang Utama", "notes": "",
                                              "checked_in_at": None, "checked_out_at": None, "created_at": now()})
    print("seeded", ids)

asyncio.run(main())
