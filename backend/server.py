from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import io
import uuid
import base64
import logging
import hashlib
import secrets
import bcrypt
import jwt
import httpx
import requests
import pandas as pd
from html import escape
from urllib.parse import urlparse
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Any
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, UploadFile, File, Header, Query, BackgroundTasks
from fastapi.responses import StreamingResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']
JWT_SECRET = os.environ['JWT_SECRET']
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
JWT_ALGO = "HS256"

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="SEKOLAHKU API")
api = APIRouter(prefix="/api")

# ---------------- OBJECT STORAGE ----------------
STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip().rstrip("/") or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE + "/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
APP_NAME = "sekolahku"
storage_key: Optional[str] = None

def init_storage(force: bool = False):
    global storage_key
    if storage_key and not force:
        return storage_key
    try:
        r = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
        r.raise_for_status()
        storage_key = r.json()["storage_key"]
        return storage_key
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
        return None

def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    if not key: raise HTTPException(500, "Storage tidak tersedia")
    r = requests.put(f"{STORAGE_URL}/objects/{path}",
                     headers={"X-Storage-Key": key, "Content-Type": content_type},
                     data=data, timeout=120)
    if r.status_code == 404:
        key = init_storage(force=True)
        r = requests.put(f"{STORAGE_URL}/objects/{path}",
                         headers={"X-Storage-Key": key, "Content-Type": content_type},
                         data=data, timeout=120)
    r.raise_for_status()
    return r.json()

def get_object(path: str):
    key = init_storage()
    r = requests.get(f"{STORAGE_URL}/objects/{path}",
                     headers={"X-Storage-Key": key}, timeout=60)
    if r.status_code == 404:
        key = init_storage(force=True)
        r = requests.get(f"{STORAGE_URL}/objects/{path}",
                         headers={"X-Storage-Key": key}, timeout=60)
    r.raise_for_status()
    return r.content, r.headers.get("Content-Type", "application/octet-stream")

MIME = {"jpg":"image/jpeg","jpeg":"image/jpeg","png":"image/png","gif":"image/gif","webp":"image/webp","pdf":"application/pdf"}

# ---------------- SCHOOL SETTINGS ----------------
DEFAULT_SETTINGS = {
    "school_name": "SEKOLAHKU",
    "school_full_name": "SMA NEGERI 1 SEKOLAHKU",
    "school_address": "Jl. Pendidikan No. 1, Jakarta",
    "school_logo_url": "",
    "id_card_valid_years": "2025 - 2028",
    "id_card_rules": [
        "Kartu ini wajib dibawa selama berada di lingkungan sekolah.",
        "Digunakan untuk presensi QR & peminjaman inventaris.",
        "Apabila hilang/rusak, segera lapor ke Tata Usaha."
    ],
    "footer_text": "Sistem Manajemen Sekolah Terpadu",
    "primary_color": "#0284C7",
    # School info (Informasi Sekolah)
    "about": "",
    "vision": "",
    "mission": [],
    "history": "",
    "principal_name": "",
    "established_year": "",
    "npsn": "",
    "accreditation": "",
    "contact_phone": "",
    "contact_email": "",
    "contact_website": "",
    "hero_image_url": "",
}

async def get_settings() -> dict:
    doc = await db.settings.find_one({"_id": "singleton"})
    if not doc:
        await db.settings.insert_one({"_id": "singleton", **DEFAULT_SETTINGS})
        return DEFAULT_SETTINGS.copy()
    doc.pop("_id", None)
    # Fill in any missing keys with defaults
    merged = {**DEFAULT_SETTINGS, **doc}
    return merged

# ---------------- STYLED EXCEL HELPER ----------------
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

SKY_600 = "0284C7"
SKY_100 = "E0F2FE"
SLATE_900 = "0F172A"
SLATE_50 = "F8FAFC"

def _border(color="CBD5E1"):
    s = Side(style="thin", color=color)
    return Border(left=s, right=s, top=s, bottom=s)

def pretty_excel(title: str, subtitle: str, columns: list, rows: list,
                 summary: Optional[dict] = None, sheet_name: str = "Laporan",
                 brand: str = "SEKOLAHKU") -> bytes:
    """Create branded SEKOLAHKU Excel: title bar (sky-blue), meta, styled headers, alternating rows, summary.
    Emoji-free titles to guarantee compatibility with all Excel/LibreOffice versions."""
    wb = Workbook()
    ws = wb.active
    ws.title = sheet_name[:31]
    n_cols = len(columns)
    last_col = get_column_letter(n_cols)

    # Title row
    ws.merge_cells(f"A1:{last_col}1")
    c = ws["A1"]
    c.value = f"{brand}  -  {title}"
    c.font = Font(name="Calibri", size=18, bold=True, color="FFFFFF")
    c.fill = PatternFill("solid", fgColor=SKY_600)
    c.alignment = Alignment(horizontal="left", vertical="center", indent=1)
    ws.row_dimensions[1].height = 34

    # Subtitle row
    ws.merge_cells(f"A2:{last_col}2")
    c2 = ws["A2"]
    c2.value = subtitle
    c2.font = Font(name="Calibri", size=10, italic=True, color="FFFFFF")
    c2.fill = PatternFill("solid", fgColor=SLATE_900)
    c2.alignment = Alignment(horizontal="left", vertical="center", indent=1)
    ws.row_dimensions[2].height = 22

    # Blank spacer
    ws.row_dimensions[3].height = 8

    # Header row (row 4)
    hdr_row = 4
    for i, col in enumerate(columns, 1):
        cell = ws.cell(row=hdr_row, column=i, value=col)
        cell.font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
        cell.fill = PatternFill("solid", fgColor=SKY_600)
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = _border("FFFFFF")
    ws.row_dimensions[hdr_row].height = 30

    # Data rows
    for ri, row in enumerate(rows):
        r = hdr_row + 1 + ri
        fill = PatternFill("solid", fgColor=SLATE_50) if ri % 2 == 0 else None
        for ci, key in enumerate(columns, 1):
            val = row.get(key) if isinstance(row, dict) else row[ci-1]
            cell = ws.cell(row=r, column=ci, value=val if val is not None else "-")
            cell.font = Font(name="Calibri", size=10, color=SLATE_900)
            cell.alignment = Alignment(horizontal="left" if ci == 1 else "center", vertical="center", wrap_text=True)
            cell.border = _border()
            if fill: cell.fill = fill
        ws.row_dimensions[r].height = 22

    # Summary section
    if summary:
        gap = hdr_row + len(rows) + 2
        ws.merge_cells(f"A{gap}:{last_col}{gap}")
        s = ws.cell(row=gap, column=1, value="RINGKASAN")
        s.font = Font(bold=True, color="FFFFFF", size=11)
        s.fill = PatternFill("solid", fgColor=SLATE_900)
        s.alignment = Alignment(horizontal="center", vertical="center")
        ws.row_dimensions[gap].height = 24
        for i, (k, v) in enumerate(summary.items()):
            r = gap + 1 + i
            kc = ws.cell(row=r, column=1, value=k)
            kc.font = Font(bold=True, color=SLATE_900)
            kc.fill = PatternFill("solid", fgColor=SKY_100)
            kc.border = _border()
            kc.alignment = Alignment(horizontal="left", indent=1, vertical="center")
            ws.merge_cells(start_row=r, start_column=2, end_row=r, end_column=n_cols)
            vc = ws.cell(row=r, column=2, value=v)
            vc.font = Font(bold=True, color=SKY_600)
            vc.alignment = Alignment(horizontal="right", indent=1, vertical="center")
            vc.border = _border()

    # Column widths
    for i in range(1, n_cols + 1):
        max_len = max([len(str(columns[i-1]))] + [len(str((r.get(columns[i-1]) if isinstance(r, dict) else r[i-1]) or "")) for r in rows[:100]])
        ws.column_dimensions[get_column_letter(i)].width = min(max(14, max_len + 4), 40)

    ws.sheet_view.showGridLines = False
    ws.freeze_panes = f"A{hdr_row+1}"

    buf = io.BytesIO()
    wb.save(buf); buf.seek(0)
    return buf.getvalue()

def xlsx_response(data: bytes, filename: str) -> StreamingResponse:
    return StreamingResponse(io.BytesIO(data),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'})

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- ROLES ----------------
ROLES = ["super_admin", "kepsek", "staff_tu", "guru", "siswa", "ketua_osis", "ketua_kelas", "orang_tua"]

# ---------------- UTIL ----------------
def now_iso():
    return datetime.now(timezone.utc).isoformat()

def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def verify_pw(pw: str, h: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), h.encode())
    except Exception:
        return False

def create_token(user_id: str, email: str, role: str, minutes=60*24*7) -> str:
    payload = {"sub": user_id, "email": email, "role": role,
               "exp": datetime.now(timezone.utc) + timedelta(minutes=minutes), "type": "access"}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")
    user = await db.users.find_one({"id": payload["sub"]}, {"password_hash": 0})
    if not user:
        raise HTTPException(401, "User not found")
    user.pop("_id", None)
    return user

def require_roles(*allowed):
    async def dep(user=Depends(get_current_user)):
        if user["role"] not in allowed and user["role"] != "super_admin":
            raise HTTPException(403, "Forbidden")
        return user
    return dep

def strip(doc):
    if doc is None: return None
    doc.pop("_id", None); doc.pop("password_hash", None)
    return doc

# ---------------- MODELS ----------------
class LoginIn(BaseModel):
    email: EmailStr
    password: str

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str
    nisn: Optional[str] = None
    kelas: Optional[str] = None
    jurusan: Optional[str] = None
    photo: Optional[str] = None
    parent_name: Optional[str] = None
    parent_email: Optional[EmailStr] = None
    parent_phone: Optional[str] = None
    student_id: Optional[str] = None  # for orang_tua linking

class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    password: Optional[str] = None
    kelas: Optional[str] = None
    jurusan: Optional[str] = None
    nisn: Optional[str] = None
    photo: Optional[str] = None
    parent_name: Optional[str] = None
    parent_email: Optional[EmailStr] = None
    parent_phone: Optional[str] = None
    student_id: Optional[str] = None

# ---------------- AUTH ----------------
@api.post("/auth/login")
async def login(body: LoginIn, response: Response):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_pw(body.password, user["password_hash"]):
        raise HTTPException(401, "Email atau password salah")
    token = create_token(user["id"], user["email"], user["role"])
    response.set_cookie("access_token", token, httponly=True, secure=True,
                        samesite="none", max_age=60*60*24*7, path="/")
    return {"token": token, "user": strip(user)}

@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}

@api.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return user

# ---------------- USERS (Super Admin) ----------------
@api.get("/users")
async def list_users(role: Optional[str] = None, user=Depends(get_current_user)):
    q = {}
    if role: q["role"] = role
    users = await db.users.find(q, {"password_hash": 0, "_id": 0}).to_list(1000)
    return users

@api.post("/users")
async def create_user(body: UserCreate, user=Depends(require_roles("super_admin"))):
    if body.role not in ROLES:
        raise HTTPException(400, "Role tidak valid")
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "Email sudah terdaftar")
    uid = str(uuid.uuid4())
    qr_payload = f"SEKOLAHKU-{uid}"
    doc = {
        "id": uid, "email": email, "password_hash": hash_pw(body.password),
        "name": body.name, "role": body.role,
        "nisn": body.nisn, "kelas": body.kelas, "jurusan": body.jurusan,
        "photo": body.photo, "qr_code": qr_payload,
        "parent_name": body.parent_name, "parent_email": body.parent_email, "parent_phone": body.parent_phone,
        "student_id": body.student_id,
        "created_at": now_iso(),
    }
    await db.users.insert_one(doc)
    return strip(doc)

@api.patch("/users/{uid}")
async def update_user(uid: str, body: UserUpdate, user=Depends(require_roles("super_admin"))):
    upd = {k: v for k, v in body.model_dump().items() if v is not None}
    if "password" in upd:
        upd["password_hash"] = hash_pw(upd.pop("password"))
    if "role" in upd and upd["role"] not in ROLES:
        raise HTTPException(400, "Role tidak valid")
    await db.users.update_one({"id": uid}, {"$set": upd})
    doc = await db.users.find_one({"id": uid}, {"password_hash": 0, "_id": 0})
    return doc

@api.delete("/users/{uid}")
async def delete_user(uid: str, user=Depends(require_roles("super_admin"))):
    await db.users.delete_one({"id": uid})
    return {"ok": True}

# ---------------- CLASSES (Kelas) ----------------
class ClassIn(BaseModel):
    name: str
    subjects: List[str] = []
    homeroom_teacher_id: Optional[str] = None
    description: Optional[str] = None

class ClassUpdate(BaseModel):
    name: Optional[str] = None
    subjects: Optional[List[str]] = None
    homeroom_teacher_id: Optional[str] = None
    description: Optional[str] = None

@api.get("/classes")
async def list_classes(user=Depends(get_current_user)):
    classes = await db.classes.find({}, {"_id": 0}).sort("name", 1).to_list(500)
    # Students & class/osis leaders only see their own class
    if user["role"] in ("siswa", "ketua_kelas", "ketua_osis") and user.get("kelas"):
        classes = [c for c in classes if c.get("name") == user.get("kelas")]
    # attach student count
    for c in classes:
        c["student_count"] = await db.users.count_documents({"role": "siswa", "kelas": c["name"]})
    return classes

@api.get("/classes/{cid}")
async def get_class(cid: str, user=Depends(get_current_user)):
    c = await db.classes.find_one({"id": cid}, {"_id": 0})
    if not c:
        raise HTTPException(404, "Kelas tidak ditemukan")
    return c

@api.post("/classes")
async def create_class(body: ClassIn, user=Depends(require_roles("super_admin"))):
    if await db.classes.find_one({"name": body.name}):
        raise HTTPException(400, "Nama kelas sudah ada")
    doc = {"id": str(uuid.uuid4()), **body.model_dump(), "created_at": now_iso()}
    await db.classes.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.patch("/classes/{cid}")
async def update_class(cid: str, body: ClassUpdate, user=Depends(require_roles("super_admin"))):
    upd = {k: v for k, v in body.model_dump().items() if v is not None}
    await db.classes.update_one({"id": cid}, {"$set": upd})
    return await db.classes.find_one({"id": cid}, {"_id": 0})

@api.delete("/classes/{cid}")
async def delete_class(cid: str, user=Depends(require_roles("super_admin"))):
    await db.classes.delete_one({"id": cid})
    return {"ok": True}

# ---------------- ATTENDANCE ----------------
class ScanIn(BaseModel):
    qr_code: str
    status: str = "hadir"  # hadir | izin | sakit | alpa
    photo: Optional[str] = None  # URL of webcam snapshot for anti-titip proof

@api.post("/attendance/scan")
async def scan(body: ScanIn, user=Depends(require_roles("staff_tu", "guru", "super_admin"))):
    if body.status not in ["hadir", "izin", "sakit", "alpa"]:
        raise HTTPException(400, "Status tidak valid")
    student = await db.users.find_one({"qr_code": body.qr_code, "role": "siswa"})
    if not student:
        raise HTTPException(404, "QR tidak dikenali")
    today = datetime.now(timezone.utc).date().isoformat()
    existing = await db.attendance.find_one({"student_id": student["id"], "date": today})
    if existing:
        upd = {"status": body.status, "scanned_at": now_iso()}
        if body.photo: upd["photo"] = body.photo
        await db.attendance.update_one({"id": existing["id"]}, {"$set": upd})
        return {"ok": True, "student": strip(student), "status": body.status, "updated": True}
    rec = {"id": str(uuid.uuid4()), "student_id": student["id"], "student_name": student["name"],
           "kelas": student.get("kelas"), "date": today, "status": body.status, "scanned_at": now_iso(),
           "scanned_by": user["name"], "photo": body.photo}
    await db.attendance.insert_one(rec)
    return {"ok": True, "student": strip(student), "status": body.status}

@api.get("/attendance")
async def list_attendance(date: Optional[str] = None, kelas: Optional[str] = None, user=Depends(get_current_user)):
    q = {}
    if date: q["date"] = date
    if kelas: q["kelas"] = kelas
    rows = await db.attendance.find(q, {"_id": 0}).sort("scanned_at", -1).to_list(2000)
    return rows

@api.get("/attendance/stats")
async def att_stats(date: Optional[str] = None, user=Depends(get_current_user)):
    date = date or datetime.now(timezone.utc).date().isoformat()
    pipeline = [{"$match": {"date": date}}, {"$group": {"_id": "$status", "n": {"$sum": 1}}}]
    total_siswa = await db.users.count_documents({"role": "siswa"})
    agg = await db.attendance.aggregate(pipeline).to_list(100)
    out = {"hadir": 0, "izin": 0, "sakit": 0, "alpa": 0}
    for r in agg: out[r["_id"]] = r["n"]
    out["belum_absen"] = max(0, total_siswa - sum(out.values()))
    out["total_siswa"] = total_siswa
    out["date"] = date
    return out

@api.get("/attendance/export")
async def export_attendance(date: Optional[str] = None, user=Depends(get_current_user)):
    q = {}
    if date: q["date"] = date
    docs = await db.attendance.find(q, {"_id": 0}).sort("scanned_at", -1).to_list(5000)
    columns = ["Tanggal", "Nama Siswa", "Kelas", "Status", "Waktu Scan", "Petugas"]
    rows = [{"Tanggal": d.get("date"), "Nama Siswa": d.get("student_name"),
             "Kelas": d.get("kelas") or "-", "Status": (d.get("status") or "").upper(),
             "Waktu Scan": d.get("scanned_at","")[:19].replace("T"," "),
             "Petugas": d.get("scanned_by") or "-"} for d in docs]
    from collections import Counter
    counter = Counter(d.get("status") for d in docs)
    summary = {"Total Record": len(docs), "Hadir": counter.get("hadir",0),
               "Izin": counter.get("izin",0), "Sakit": counter.get("sakit",0), "Alpa": counter.get("alpa",0)}
    data = pretty_excel(f"Laporan Presensi {date or 'Semua Tanggal'}",
                        f"Diekspor oleh {user['name']} pada {now_iso()[:19].replace('T',' ')}",
                        columns, rows, summary, "Presensi")
    return xlsx_response(data, f"Presensi_{date or 'all'}.xlsx")

# ---------------- INVENTORY ----------------
class InventoryItem(BaseModel):
    name: str
    category: str
    stock: int
    condition: str = "Baik"

class BorrowRequest(BaseModel):
    item_id: str
    quantity: int = 1
    purpose: str
    return_date: str

@api.get("/inventory")
async def list_inventory(user=Depends(get_current_user)):
    return await db.inventory.find({}, {"_id": 0}).to_list(500)

@api.post("/inventory")
async def add_inventory(body: InventoryItem, user=Depends(require_roles("staff_tu", "super_admin"))):
    doc = {"id": str(uuid.uuid4()), **body.model_dump(), "created_at": now_iso()}
    await db.inventory.insert_one(doc); doc.pop("_id", None)
    return doc

@api.delete("/inventory/{iid}")
async def del_inventory(iid: str, user=Depends(require_roles("staff_tu", "super_admin"))):
    await db.inventory.delete_one({"id": iid}); return {"ok": True}

@api.post("/borrow")
async def create_borrow(body: BorrowRequest, user=Depends(get_current_user)):
    item = await db.inventory.find_one({"id": body.item_id})
    if not item: raise HTTPException(404, "Item tidak ditemukan")
    doc = {"id": str(uuid.uuid4()), "item_id": body.item_id, "item_name": item["name"],
           "quantity": body.quantity, "purpose": body.purpose, "return_date": body.return_date,
           "requester_id": user["id"], "requester_name": user["name"],
           "status": "Menunggu Approval", "created_at": now_iso()}
    await db.borrow_requests.insert_one(doc); doc.pop("_id", None)
    return doc

@api.get("/borrow")
async def list_borrow(mine: bool = False, user=Depends(get_current_user)):
    q = {"requester_id": user["id"]} if mine else {}
    return await db.borrow_requests.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)

@api.patch("/borrow/{bid}")
async def update_borrow(bid: str, status: str, user=Depends(require_roles("staff_tu", "super_admin"))):
    if status not in ["Disetujui", "Ditolak", "Dikembalikan"]:
        raise HTTPException(400, "Status tidak valid")
    await db.borrow_requests.update_one({"id": bid}, {"$set": {"status": status, "updated_at": now_iso(),
                                                                 "approved_by": user["name"]}})
    br = await db.borrow_requests.find_one({"id": bid})
    if br and br.get("requester_id"):
        await notify([br["requester_id"]],
                     f"Peminjaman: {status}",
                     f"Permintaan {br.get('item_name')} × {br.get('quantity')} — {status}",
                     "/inventory")
    return {"ok": True}

# ---------------- ASSIGNMENTS ----------------
class AssignmentIn(BaseModel):
    title: str
    description: str
    kelas: str
    due_date: str
    subject: Optional[str] = None
    class_id: Optional[str] = None
    attachments: Optional[List[dict]] = None  # [{url, name, type}]

class SubmissionIn(BaseModel):
    assignment_id: str
    content: Optional[str] = ""
    attachments: Optional[List[dict]] = None  # [{url, name, type}]

@api.get("/assignments")
async def list_assign(class_id: Optional[str] = None, subject: Optional[str] = None, user=Depends(get_current_user)):
    q = {}
    if user["role"] == "siswa":
        q["kelas"] = user.get("kelas")
    if class_id: q["class_id"] = class_id
    if subject: q["subject"] = subject
    return await db.assignments.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)

@api.post("/assignments")
async def create_assign(body: AssignmentIn, user=Depends(require_roles("guru", "super_admin"))):
    doc = {"id": str(uuid.uuid4()), **body.model_dump(), "teacher_id": user["id"],
           "teacher_name": user["name"], "created_at": now_iso()}
    await db.assignments.insert_one(doc); doc.pop("_id", None)
    return doc

@api.post("/submissions")
async def submit(body: SubmissionIn, user=Depends(require_roles("siswa"))):
    existing = await db.submissions.find_one({"assignment_id": body.assignment_id, "student_id": user["id"]})
    payload = {"content": body.content or "", "attachments": body.attachments or [], "submitted_at": now_iso()}
    if existing:
        await db.submissions.update_one({"id": existing["id"]}, {"$set": payload})
        return {"ok": True}
    doc = {"id": str(uuid.uuid4()), "assignment_id": body.assignment_id, "student_id": user["id"],
           "student_name": user["name"], "grade": None, **payload}
    await db.submissions.insert_one(doc)
    return {"ok": True}

@api.get("/submissions")
async def list_subs(assignment_id: Optional[str] = None, user=Depends(get_current_user)):
    q = {}
    if assignment_id: q["assignment_id"] = assignment_id
    if user["role"] == "siswa": q["student_id"] = user["id"]
    return await db.submissions.find(q, {"_id": 0}).to_list(1000)

@api.patch("/submissions/{sid}/grade")
async def grade_sub(sid: str, grade: float, user=Depends(require_roles("guru", "super_admin"))):
    await db.submissions.update_one({"id": sid}, {"$set": {"grade": grade}})
    sub = await db.submissions.find_one({"id": sid})
    if sub and sub.get("student_id"):
        assign = await db.assignments.find_one({"id": sub["assignment_id"]})
        await notify([sub["student_id"]], "Tugas dinilai",
                     f"Tugas '{assign['title'] if assign else ''}' mendapat nilai {grade}", "/assignments")
    return {"ok": True}

# ---------------- QUIZZES ----------------
class QuizIn(BaseModel):
    title: str
    kelas: str
    questions: List[dict]  # [{q, options[], answer}]
    subject: Optional[str] = None
    class_id: Optional[str] = None

class QuizAttemptIn(BaseModel):
    quiz_id: str
    answers: List[int]

@api.get("/quizzes")
async def list_quiz(class_id: Optional[str] = None, subject: Optional[str] = None, user=Depends(get_current_user)):
    q = {"kelas": user.get("kelas")} if user["role"] == "siswa" else {}
    if class_id: q["class_id"] = class_id
    if subject: q["subject"] = subject
    quizzes = await db.quizzes.find(q, {"_id": 0}).to_list(500)
    if user["role"] == "siswa":
        for qz in quizzes:
            for question in qz.get("questions", []):
                question.pop("answer", None)
    return quizzes

@api.post("/quizzes")
async def create_quiz(body: QuizIn, user=Depends(require_roles("guru", "super_admin"))):
    doc = {"id": str(uuid.uuid4()), **body.model_dump(), "teacher_id": user["id"],
           "teacher_name": user["name"], "created_at": now_iso()}
    await db.quizzes.insert_one(doc); doc.pop("_id", None)
    return doc

@api.post("/quizzes/attempt")
async def attempt_quiz(body: QuizAttemptIn, user=Depends(require_roles("siswa"))):
    quiz = await db.quizzes.find_one({"id": body.quiz_id})
    if not quiz: raise HTTPException(404, "Quiz tidak ditemukan")
    questions = quiz.get("questions", [])
    score = 0
    for i, q in enumerate(questions):
        if i < len(body.answers) and body.answers[i] == q.get("answer"):
            score += 1
    total = len(questions)
    percent = (score / total * 100) if total else 0
    doc = {"id": str(uuid.uuid4()), "quiz_id": body.quiz_id, "student_id": user["id"],
           "student_name": user["name"], "score": score, "total": total, "percent": percent,
           "submitted_at": now_iso()}
    await db.quiz_attempts.replace_one({"quiz_id": body.quiz_id, "student_id": user["id"]}, doc, upsert=True)
    return {"score": score, "total": total, "percent": percent}

# ---------------- SCHOOLGRAM ----------------
class PostIn(BaseModel):
    image: str  # base64 or URL
    caption: str

@api.get("/posts")
async def list_posts(user=Depends(get_current_user)):
    posts = await db.posts.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    for p in posts:
        p["like_count"] = len(p.get("likes", []))
        p["liked"] = user["id"] in p.get("likes", [])
    return posts

@api.post("/posts")
async def create_post(body: PostIn, user=Depends(get_current_user)):
    if user["role"] not in ["ketua_kelas", "ketua_osis", "super_admin", "guru"]:
        raise HTTPException(403, "Hanya Ketua Kelas / OSIS / Guru yang dapat posting")
    doc = {"id": str(uuid.uuid4()), "image": body.image, "caption": body.caption,
           "author_id": user["id"], "author_name": user["name"], "author_role": user["role"],
           "kelas": user.get("kelas"), "likes": [], "comments": [], "created_at": now_iso()}
    await db.posts.insert_one(doc); doc.pop("_id", None)
    return doc

@api.post("/posts/{pid}/like")
async def like_post(pid: str, user=Depends(get_current_user)):
    post = await db.posts.find_one({"id": pid})
    if not post: raise HTTPException(404, "Post tidak ditemukan")
    likes = post.get("likes", [])
    if user["id"] in likes:
        likes.remove(user["id"])
    else:
        likes.append(user["id"])
    await db.posts.update_one({"id": pid}, {"$set": {"likes": likes}})
    return {"like_count": len(likes), "liked": user["id"] in likes}

class CommentIn(BaseModel):
    text: str

@api.post("/posts/{pid}/comment")
async def comment_post(pid: str, body: CommentIn, user=Depends(get_current_user)):
    c = {"id": str(uuid.uuid4()), "user_name": user["name"], "text": body.text, "created_at": now_iso()}
    await db.posts.update_one({"id": pid}, {"$push": {"comments": c}})
    return c

# ---------------- ANNOUNCEMENTS ----------------
class AnnouncementIn(BaseModel):
    title: str
    content: str
    scope: str = "sekolah"  # sekolah | osis | kelas

@api.get("/announcements")
async def list_ann(user=Depends(get_current_user)):
    return await db.announcements.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)

@api.post("/announcements")
async def add_ann(body: AnnouncementIn, user=Depends(get_current_user)):
    if user["role"] not in ["super_admin", "kepsek", "ketua_osis", "ketua_kelas", "staff_tu", "guru"]:
        raise HTTPException(403, "Forbidden")
    doc = {"id": str(uuid.uuid4()), **body.model_dump(), "author": user["name"],
           "role": user["role"], "created_at": now_iso()}
    await db.announcements.insert_one(doc); doc.pop("_id", None)
    # notify students
    student_ids = [u["id"] for u in await db.users.find({"role": "siswa"}, {"id": 1}).to_list(2000)]
    await notify(student_ids, f"📢 {body.title}", body.content[:120], "/announcements")
    return doc

# ---------------- UANG KAS ----------------
class KasIn(BaseModel):
    kelas: str
    amount: float
    note: str = ""
    type: str = "masuk"  # masuk | keluar

@api.get("/kas")
async def list_kas(kelas: Optional[str] = None, user=Depends(get_current_user)):
    q = {}
    if kelas: q["kelas"] = kelas
    elif user["role"] == "siswa" and user.get("kelas"): q["kelas"] = user["kelas"]
    return await db.uang_kas.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)

@api.post("/kas")
async def add_kas(body: KasIn, user=Depends(get_current_user)):
    doc = {"id": str(uuid.uuid4()), **body.model_dump(),
           "recorded_by": user["name"], "created_at": now_iso()}
    await db.uang_kas.insert_one(doc); doc.pop("_id", None)
    return doc

# ---------------- SOCIAL FUND ----------------
@api.get("/social-fund")
async def list_sf(user=Depends(get_current_user)):
    return await db.social_fund.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)

@api.post("/social-fund")
async def add_sf(body: KasIn, user=Depends(require_roles("ketua_osis", "super_admin"))):
    doc = {"id": str(uuid.uuid4()), **body.model_dump(),
           "recorded_by": user["name"], "created_at": now_iso()}
    await db.social_fund.insert_one(doc); doc.pop("_id", None)
    return doc

# ---------------- OSIS ELECTIONS ----------------
class CandidateIn(BaseModel):
    name: str
    position: str  # ketua | wakil | anggota
    vision: str
    mission: str
    photo: Optional[str] = None

@api.get("/candidates")
async def list_candidates(user=Depends(get_current_user)):
    cands = await db.candidates.find({}, {"_id": 0}).to_list(200)
    for c in cands:
        c["vote_count"] = await db.votes.count_documents({"candidate_id": c["id"]})
    return cands

@api.post("/candidates")
async def add_candidate(body: CandidateIn, user=Depends(require_roles("super_admin", "ketua_osis"))):
    doc = {"id": str(uuid.uuid4()), **body.model_dump(), "created_at": now_iso()}
    await db.candidates.insert_one(doc); doc.pop("_id", None)
    return doc

@api.delete("/candidates/{cid}")
async def del_candidate(cid: str, user=Depends(require_roles("super_admin", "ketua_osis"))):
    await db.candidates.delete_one({"id": cid}); return {"ok": True}

@api.post("/vote/{cid}")
async def vote(cid: str, user=Depends(require_roles("siswa"))):
    cand = await db.candidates.find_one({"id": cid})
    if not cand: raise HTTPException(404, "Kandidat tidak ditemukan")
    existing = await db.votes.find_one({"student_id": user["id"], "position": cand["position"]})
    if existing:
        raise HTTPException(400, f"Anda sudah memilih untuk posisi {cand['position']}")
    await db.votes.insert_one({"id": str(uuid.uuid4()), "candidate_id": cid,
                                "position": cand["position"], "student_id": user["id"],
                                "created_at": now_iso()})
    return {"ok": True}

@api.get("/my-votes")
async def my_votes(user=Depends(get_current_user)):
    votes = await db.votes.find({"student_id": user["id"]}, {"_id": 0}).to_list(20)
    return votes

# ---------------- FEEDBACK ----------------
class FeedbackIn(BaseModel):
    category: str  # saran | kritik | laporan
    content: str
    anonymous: bool = False

@api.post("/feedback")
async def add_feedback(body: FeedbackIn, user=Depends(get_current_user)):
    doc = {"id": str(uuid.uuid4()), **body.model_dump(),
           "user_name": "Anonim" if body.anonymous else user["name"],
           "created_at": now_iso()}
    await db.feedback.insert_one(doc); doc.pop("_id", None)
    return doc

@api.get("/feedback")
async def list_feedback(user=Depends(require_roles("super_admin", "kepsek"))):
    return await db.feedback.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)

# ---------------- ACHIEVEMENTS ----------------
@api.get("/achievements")
async def achievements(user=Depends(get_current_user)):
    # Most diligent = highest submission count
    sub_pipeline = [{"$group": {"_id": "$student_id", "count": {"$sum": 1}, "name": {"$first": "$student_name"}}},
                    {"$sort": {"count": -1}}, {"$limit": 10}]
    diligent = await db.submissions.aggregate(sub_pipeline).to_list(10)
    # Top academic = avg quiz percent
    quiz_pipeline = [{"$group": {"_id": "$student_id", "avg": {"$avg": "$percent"},
                                  "name": {"$first": "$student_name"}, "count": {"$sum": 1}}},
                     {"$sort": {"avg": -1}}, {"$limit": 10}]
    academic = await db.quiz_attempts.aggregate(quiz_pipeline).to_list(10)
    return {"most_diligent": diligent, "top_academic": academic}

# ---------------- STATS ----------------
@api.get("/stats")
async def stats(user=Depends(get_current_user)):
    return {
        "users": await db.users.count_documents({}),
        "siswa": await db.users.count_documents({"role": "siswa"}),
        "guru": await db.users.count_documents({"role": "guru"}),
        "inventory": await db.inventory.count_documents({}),
        "assignments": await db.assignments.count_documents({}),
        "quizzes": await db.quizzes.count_documents({}),
        "posts": await db.posts.count_documents({}),
        "pending_borrow": await db.borrow_requests.count_documents({"status": "Menunggu Approval"}),
    }

# ---------------- UPLOAD / FILES ----------------
@api.post("/upload")
async def upload_file(file: UploadFile = File(...), user=Depends(get_current_user)):
    ext = (file.filename or "bin").rsplit(".", 1)[-1].lower()
    ct = file.content_type or MIME.get(ext, "application/octet-stream")
    path = f"{APP_NAME}/uploads/{user['id']}/{uuid.uuid4()}.{ext}"
    data = await file.read()
    if len(data) > 10 * 1024 * 1024:
        raise HTTPException(400, "File maksimal 10MB")
    result = put_object(path, data, ct)
    fid = str(uuid.uuid4())
    await db.files.insert_one({"id": fid, "storage_path": result["path"], "content_type": ct,
                                "size": result.get("size", len(data)), "owner_id": user["id"],
                                "is_deleted": False, "created_at": now_iso()})
    return {"id": fid, "path": result["path"], "url": f"/api/files/{result['path']}"}

@api.get("/files/{path:path}")
async def download_file(path: str, request: Request, auth: Optional[str] = Query(None)):
    # auth via cookie OR ?auth=token (for <img src>)
    token = request.cookies.get("access_token")
    if not token and auth: token = auth
    if not token:
        auth_h = request.headers.get("Authorization", "")
        if auth_h.startswith("Bearer "): token = auth_h[7:]
    if not token: raise HTTPException(401, "Not authenticated")
    try: jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except Exception: raise HTTPException(401, "Invalid token")
    rec = await db.files.find_one({"storage_path": path, "is_deleted": False})
    if not rec: raise HTTPException(404, "File tidak ditemukan")
    data, ct = get_object(path)
    return Response(content=data, media_type=rec.get("content_type", ct),
                    headers={"Cache-Control": "public, max-age=86400"})

# ---------------- NOTIFICATIONS ----------------
async def notify(user_ids: List[str], title: str, body: str, link: Optional[str] = None):
    if isinstance(user_ids, str): user_ids = [user_ids]
    now = now_iso()
    docs = [{"id": str(uuid.uuid4()), "user_id": uid, "title": title, "body": body,
             "link": link, "read": False, "created_at": now} for uid in user_ids]
    if docs: await db.notifications.insert_many(docs)

@api.get("/notifications")
async def list_notif(user=Depends(get_current_user)):
    rows = await db.notifications.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).limit(50).to_list(50)
    unread = await db.notifications.count_documents({"user_id": user["id"], "read": False})
    return {"items": rows, "unread": unread}

@api.post("/notifications/read")
async def mark_all_read(user=Depends(get_current_user)):
    await db.notifications.update_many({"user_id": user["id"], "read": False}, {"$set": {"read": True}})
    return {"ok": True}

# ---------------- ANALYTICS (Kepsek) ----------------
@api.get("/analytics/kepsek")
async def analytics(user=Depends(require_roles("kepsek", "super_admin"))):
    # 7-day attendance trend
    today = datetime.now(timezone.utc).date()
    days = [(today - timedelta(days=i)).isoformat() for i in range(6, -1, -1)]
    trend = []
    for d in days:
        pipe = [{"$match": {"date": d}}, {"$group": {"_id": "$status", "n": {"$sum": 1}}}]
        agg = await db.attendance.aggregate(pipe).to_list(10)
        row = {"date": d, "hadir": 0, "izin": 0, "sakit": 0, "alpa": 0}
        for r in agg: row[r["_id"]] = r["n"]
        trend.append(row)
    # Quiz score distribution buckets
    buckets = [{"range": "0-40", "count": 0}, {"range": "41-60", "count": 0},
               {"range": "61-80", "count": 0}, {"range": "81-100", "count": 0}]
    async for a in db.quiz_attempts.find({}, {"percent": 1}):
        p = a.get("percent", 0)
        idx = 0 if p <= 40 else 1 if p <= 60 else 2 if p <= 80 else 3
        buckets[idx]["count"] += 1
    # Class activity ranking (posts + submissions + quiz attempts by kelas of student)
    class_rank = {}
    users_by_id = {u["id"]: u.get("kelas") for u in await db.users.find({"role": "siswa"}, {"id": 1, "kelas": 1}).to_list(1000)}
    for coll in ["submissions", "quiz_attempts"]:
        async for r in db[coll].find({}, {"student_id": 1}):
            k = users_by_id.get(r.get("student_id"))
            if k: class_rank[k] = class_rank.get(k, 0) + 1
    async for p in db.posts.find({}, {"kelas": 1}):
        k = p.get("kelas")
        if k: class_rank[k] = class_rank.get(k, 0) + 2
    ranking = sorted([{"kelas": k, "score": v} for k, v in class_rank.items()], key=lambda x: -x["score"])[:10]
    return {"trend": trend, "quiz_distribution": buckets, "class_ranking": ranking}

# ---------------- PASSWORD RESET ----------------
class ForgotIn(BaseModel):
    email: EmailStr

class ResetIn(BaseModel):
    token: str
    password: str

async def send_reset_email(to_email: str, token: str):
    base = os.environ.get("FRONTEND_URL", "").rstrip("/")
    link = f"{base}/reset-password?token={token}"
    key = os.environ.get("EMERGENT_EMAIL_KEY", "")
    from_name = os.environ.get("EMAIL_FROM_NAME", "SEKOLAHKU")
    if not key or key.startswith("{") or not base.startswith("https://"):
        logger.warning("Reset link (dev): %s", link)
        return False
    brand = escape(from_name)
    html = (f'<div style="font-family:Arial;padding:24px;max-width:560px;margin:auto">'
            f'<h2 style="color:#0284C7">Reset Password {brand}</h2>'
            f'<p>Halo, kami menerima permintaan reset password untuk akun Anda di <b>{brand}</b>.</p>'
            f'<p><a href="{escape(link)}" style="display:inline-block;padding:12px 24px;background:#0F172A;color:white;text-decoration:none;border-radius:8px">Reset Password Saya</a></p>'
            f'<p style="color:#64748B;font-size:12px">Link berlaku 1 jam dan hanya bisa dipakai sekali. '
            f'Abaikan email ini jika Anda tidak meminta reset — password Anda tetap aman.</p>'
            f'<p style="color:#94A3B8;font-size:11px;margin-top:24px">— Tim {brand}. Kami tidak pernah meminta password lewat email.</p></div>')
    try:
        async with httpx.AsyncClient(timeout=30) as c:
            r = await c.post(f"{STORAGE_BASE}/api/v1/email/send",
                             headers={"X-Email-Key": key},
                             json={"to": [to_email], "subject": f"Reset password {from_name}",
                                   "html": html, "from_name": from_name})
        r.raise_for_status()
        return True
    except Exception as e:
        logger.error(f"Reset email failed: {e}")
        return False

@api.post("/auth/forgot-password")
async def forgot(body: ForgotIn, bg: BackgroundTasks):
    email = body.email.lower()
    now = datetime.now(timezone.utc)
    recent = await db.password_reset_requests.count_documents(
        {"email": email, "created_at": {"$gt": (now - timedelta(minutes=15)).isoformat()}})
    await db.password_reset_requests.insert_one({"email": email, "created_at": now.isoformat()})
    if recent >= 5:
        return {"message": "Jika email terdaftar, tautan reset telah dikirim."}
    user = await db.users.find_one({"email": email})
    if user:
        raw = secrets.token_urlsafe(32)
        h = hashlib.sha256(raw.encode()).hexdigest()
        await db.password_reset_tokens.insert_one({
            "token_hash": h, "user_id": user["id"], "email": user["email"],
            "expires_at": (now + timedelta(hours=1)).isoformat(), "used": False})
        bg.add_task(send_reset_email, user["email"], raw)
    return {"message": "Jika email terdaftar, tautan reset telah dikirim."}

@api.post("/auth/reset-password")
async def reset_pw(body: ResetIn):
    h = hashlib.sha256(body.token.encode()).hexdigest()
    now = datetime.now(timezone.utc).isoformat()
    rec = await db.password_reset_tokens.find_one_and_update(
        {"token_hash": h, "used": False, "expires_at": {"$gt": now}},
        {"$set": {"used": True}})
    if not rec:
        raise HTTPException(400, "Token tidak valid atau sudah kedaluwarsa")
    if len(body.password) < 6:
        raise HTTPException(400, "Password minimal 6 karakter")
    await db.users.update_one({"id": rec["user_id"]},
                              {"$set": {"password_hash": hash_pw(body.password)}})
    await db.password_reset_tokens.delete_many({"user_id": rec["user_id"], "used": False})
    return {"ok": True}

# ---------------- REPORTS (Rapor Digital) ----------------
async def build_report(student_id: str) -> dict:
    student = await db.users.find_one({"id": student_id, "role": "siswa"}, {"password_hash": 0, "_id": 0})
    if not student: raise HTTPException(404, "Siswa tidak ditemukan")
    # Assignments
    subs = await db.submissions.find({"student_id": student_id}, {"_id": 0}).to_list(500)
    grades = [s["grade"] for s in subs if s.get("grade") is not None]
    assign_avg = round(sum(grades)/len(grades), 2) if grades else None
    # Quizzes
    attempts = await db.quiz_attempts.find({"student_id": student_id}, {"_id": 0}).to_list(500)
    quiz_avg = round(sum(a["percent"] for a in attempts)/len(attempts), 2) if attempts else None
    # Attendance
    pipe = [{"$match": {"student_id": student_id}}, {"$group": {"_id": "$status", "n": {"$sum": 1}}}]
    agg = await db.attendance.aggregate(pipe).to_list(10)
    att = {"hadir": 0, "izin": 0, "sakit": 0, "alpa": 0}
    for r in agg: att[r["_id"]] = r["n"]
    return {
        "student": student, "semester": "Genap 2025/2026",
        "assignments": {"count": len(subs), "graded": len(grades), "avg": assign_avg,
                        "list": [{"title_id": s["assignment_id"], "grade": s.get("grade"), "submitted_at": s["submitted_at"]} for s in subs]},
        "quizzes": {"count": len(attempts), "avg_percent": quiz_avg,
                    "list": [{"quiz_id": a["quiz_id"], "score": a["score"], "total": a["total"], "percent": a["percent"]} for a in attempts]},
        "attendance": att, "generated_at": now_iso(),
    }

@api.get("/reports/{student_id}")
async def get_report(student_id: str, user=Depends(get_current_user)):
    # Access: super_admin, kepsek, the siswa themselves, wali kelas (guru in same kelas), or linked orang_tua
    if user["role"] in ["super_admin", "kepsek"]: pass
    elif user["role"] == "siswa" and user["id"] == student_id: pass
    elif user["role"] == "orang_tua" and user.get("student_id") == student_id: pass
    elif user["role"] == "guru":
        s = await db.users.find_one({"id": student_id})
        if not s or s.get("kelas") != user.get("kelas"):
            raise HTTPException(403, "Bukan wali kelas siswa ini")
    else:
        raise HTTPException(403, "Forbidden")
    return await build_report(student_id)

async def send_email(to_email: str, subject: str, html: str) -> bool:
    key = os.environ.get("EMERGENT_EMAIL_KEY", "")
    from_name = os.environ.get("EMAIL_FROM_NAME", "SEKOLAHKU")
    if not key or key.startswith("{"):
        logger.warning("Email not configured; would send to %s: %s", to_email, subject)
        return False
    try:
        async with httpx.AsyncClient(timeout=30) as c:
            r = await c.post(f"{STORAGE_BASE}/api/v1/email/send",
                             headers={"X-Email-Key": key},
                             json={"to": [to_email], "subject": subject, "html": html, "from_name": from_name})
        r.raise_for_status(); return True
    except Exception as e:
        logger.error(f"send_email failed: {e}"); return False

@api.post("/reports/{student_id}/email")
async def email_report(student_id: str, bg: BackgroundTasks, user=Depends(require_roles("guru", "kepsek", "super_admin"))):
    report = await build_report(student_id)
    s = report["student"]
    to = s.get("parent_email")
    if not to: raise HTTPException(400, "Email orang tua belum diisi pada profil siswa")
    brand = escape(os.environ.get("EMAIL_FROM_NAME", "SEKOLAHKU"))
    rows_html = ""
    if report["assignments"]["avg"] is not None:
        rows_html += f'<tr><td style="padding:8px;border-bottom:1px solid #E2E8F0">Rata-rata Tugas</td><td style="padding:8px;border-bottom:1px solid #E2E8F0;text-align:right;font-weight:700">{report["assignments"]["avg"]}</td></tr>'
    if report["quizzes"]["avg_percent"] is not None:
        rows_html += f'<tr><td style="padding:8px;border-bottom:1px solid #E2E8F0">Rata-rata Mini-Quiz</td><td style="padding:8px;border-bottom:1px solid #E2E8F0;text-align:right;font-weight:700">{report["quizzes"]["avg_percent"]}%</td></tr>'
    for k, v in report["attendance"].items():
        rows_html += f'<tr><td style="padding:8px;border-bottom:1px solid #E2E8F0;text-transform:capitalize">{k}</td><td style="padding:8px;border-bottom:1px solid #E2E8F0;text-align:right">{v} hari</td></tr>'
    html = (f'<div style="font-family:Arial;padding:24px;max-width:600px;margin:auto;background:#F8FAFC">'
            f'<div style="background:linear-gradient(135deg,#0284C7,#0F172A);color:white;padding:24px;border-radius:16px 16px 0 0">'
            f'<h2 style="margin:0">{brand} - Rapor Digital</h2>'
            f'<p style="margin:4px 0 0;opacity:.85;font-size:13px">{report["semester"]}</p></div>'
            f'<div style="background:white;padding:24px;border-radius:0 0 16px 16px;border:1px solid #E2E8F0">'
            f'<h3 style="margin:0 0 4px">{escape(s["name"])}</h3>'
            f'<p style="color:#64748B;margin:0 0 16px;font-size:13px">NISN: {escape(s.get("nisn") or "-")} · Kelas: {escape(s.get("kelas") or "-")}</p>'
            f'<table style="width:100%;border-collapse:collapse;font-size:14px">{rows_html}</table>'
            f'<p style="margin-top:20px;color:#64748B;font-size:12px">Rapor ini digenerasi otomatis oleh sistem SEKOLAHKU. '
            f'Silakan hubungi wali kelas untuk klarifikasi lebih lanjut.</p></div></div>')
    bg.add_task(send_email, to, f"Rapor Digital - {s['name']}", html)
    return {"ok": True, "sent_to": to}

# ---------------- CHATS (Guru ↔ Orang Tua) ----------------
class MessageIn(BaseModel):
    body: str

def can_access_thread(user: dict, student: dict) -> bool:
    if user["role"] in ["super_admin"]: return True
    if user["role"] == "guru" and student.get("kelas") == user.get("kelas"): return True
    if user["role"] == "orang_tua" and user.get("student_id") == student["id"]: return True
    if user["role"] == "siswa" and user["id"] == student["id"]: return True
    return False

@api.get("/chats")
async def list_threads(user=Depends(get_current_user)):
    threads = []
    if user["role"] == "guru":
        students = await db.users.find({"role": "siswa", "kelas": user.get("kelas")}, {"password_hash": 0, "_id": 0}).to_list(500)
    elif user["role"] == "orang_tua":
        sid = user.get("student_id")
        s = await db.users.find_one({"id": sid}, {"password_hash": 0, "_id": 0}) if sid else None
        students = [s] if s else []
    elif user["role"] == "siswa":
        students = [await db.users.find_one({"id": user["id"]}, {"password_hash": 0, "_id": 0})]
    else:
        students = await db.users.find({"role": "siswa"}, {"password_hash": 0, "_id": 0}).to_list(500)
    for st in students:
        if not st: continue
        last = await db.chat_messages.find_one({"thread_id": st["id"]}, sort=[("created_at", -1)])
        unread = await db.chat_messages.count_documents({"thread_id": st["id"], "read_by": {"$ne": user["id"]}, "sender_id": {"$ne": user["id"]}})
        threads.append({
            "student_id": st["id"], "student_name": st["name"], "kelas": st.get("kelas"),
            "photo": st.get("photo"), "parent_name": st.get("parent_name"),
            "last_message": last["body"] if last else None,
            "last_at": last["created_at"] if last else None,
            "unread": unread,
        })
    return threads

@api.get("/chats/{student_id}/messages")
async def list_messages(student_id: str, user=Depends(get_current_user)):
    student = await db.users.find_one({"id": student_id}, {"password_hash": 0, "_id": 0})
    if not student: raise HTTPException(404, "Siswa tidak ditemukan")
    if not can_access_thread(user, student): raise HTTPException(403, "Forbidden")
    msgs = await db.chat_messages.find({"thread_id": student_id}, {"_id": 0}).sort("created_at", 1).to_list(500)
    # mark read
    await db.chat_messages.update_many(
        {"thread_id": student_id, "sender_id": {"$ne": user["id"]}, "read_by": {"$ne": user["id"]}},
        {"$addToSet": {"read_by": user["id"]}})
    return {"student": student, "messages": msgs}

@api.post("/chats/{student_id}/messages")
async def send_message(student_id: str, body: MessageIn, user=Depends(get_current_user)):
    student = await db.users.find_one({"id": student_id})
    if not student: raise HTTPException(404, "Siswa tidak ditemukan")
    if not can_access_thread(user, student): raise HTTPException(403, "Forbidden")
    if user["role"] not in ["guru", "orang_tua", "super_admin"]:
        raise HTTPException(403, "Hanya Wali Kelas & Orang Tua yang dapat mengirim pesan")
    msg = {"id": str(uuid.uuid4()), "thread_id": student_id, "sender_id": user["id"],
           "sender_name": user["name"], "sender_role": user["role"],
           "body": body.body, "read_by": [user["id"]], "created_at": now_iso()}
    await db.chat_messages.insert_one(msg); msg.pop("_id", None)
    # notify counterparty
    recipients = []
    if user["role"] in ["guru", "super_admin"]:
        parents = await db.users.find({"role": "orang_tua", "student_id": student_id}, {"id": 1}).to_list(20)
        recipients = [p["id"] for p in parents]
    elif user["role"] == "orang_tua":
        gurus = await db.users.find({"role": "guru", "kelas": student.get("kelas")}, {"id": 1}).to_list(20)
        recipients = [g["id"] for g in gurus]
    if recipients:
        await notify(recipients, f"💬 Pesan dari {user['name']}", body.body[:120], "/chats")
    return msg

# ---------------- CALENDAR / EVENTS ----------------
class EventIn(BaseModel):
    title: str
    description: str = ""
    date: str  # YYYY-MM-DD
    type: str = "event"  # event | ujian | libur | rapat
    kelas: Optional[str] = None  # None = seluruh sekolah

@api.get("/events")
async def list_events(month: Optional[str] = None, user=Depends(get_current_user)):
    q = {}
    if month:  # YYYY-MM
        q["date"] = {"$regex": f"^{month}"}
    if user["role"] == "siswa" and user.get("kelas"):
        q["$or"] = [{"kelas": None}, {"kelas": user["kelas"]}]
    rows = await db.events.find(q, {"_id": 0}).sort("date", 1).to_list(500)
    return rows

@api.post("/events")
async def add_event(body: EventIn, user=Depends(get_current_user)):
    if user["role"] not in ["super_admin", "kepsek", "staff_tu", "guru", "ketua_osis"]:
        raise HTTPException(403, "Forbidden")
    doc = {"id": str(uuid.uuid4()), **body.model_dump(), "created_by": user["name"],
           "created_at": now_iso()}
    await db.events.insert_one(doc); doc.pop("_id", None)
    # notify all students (+ orang tua)
    audience_q = {"role": {"$in": ["siswa", "orang_tua"]}}
    if body.kelas:
        # only students of that kelas + linked parents
        student_ids = [s["id"] for s in await db.users.find({"role": "siswa", "kelas": body.kelas}, {"id": 1}).to_list(500)]
        parents = [p["id"] for p in await db.users.find({"role": "orang_tua", "student_id": {"$in": student_ids}}, {"id": 1}).to_list(500)]
        user_ids = student_ids + parents
    else:
        user_ids = [u["id"] for u in await db.users.find(audience_q, {"id": 1}).to_list(2000)]
    icon = {"ujian":"📝", "libur":"🌴", "rapat":"👥"}.get(body.type, "📅")
    await notify(user_ids, f"{icon} {body.title}", f"{body.date} — {body.description[:80]}", "/calendar")
    return doc

@api.delete("/events/{eid}")
async def del_event(eid: str, user=Depends(require_roles("super_admin","kepsek","staff_tu","guru"))):
    await db.events.delete_one({"id": eid})
    return {"ok": True}

# ---------------- BATCH RAPOR PDF ----------------
import zipfile
from fpdf import FPDF

def build_pdf(report: dict) -> bytes:
    s = report["student"]
    pdf = FPDF(orientation="P", unit="mm", format="A4")
    pdf.add_page()
    # Header bar
    pdf.set_fill_color(2, 132, 199)  # sky-600
    pdf.rect(0, 0, 210, 35, style="F")
    pdf.set_text_color(255,255,255)
    pdf.set_font("Helvetica", "B", 18)
    pdf.set_xy(15, 10)
    pdf.cell(180, 8, "SEKOLAHKU - Rapor Digital", ln=1)
    pdf.set_font("Helvetica", "", 10)
    pdf.set_x(15)
    pdf.cell(180, 6, f"Semester {report['semester']}", ln=1)
    # Student info
    pdf.set_text_color(15,23,42)
    pdf.set_xy(15, 45)
    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(180, 8, s["name"], ln=1)
    pdf.set_font("Helvetica", "", 10)
    pdf.set_x(15)
    pdf.cell(180, 6, f"NISN: {s.get('nisn') or '-'}    Kelas: {s.get('kelas') or '-'}    Jurusan: {s.get('jurusan') or '-'}", ln=1)
    # Section: Tugas
    y = 70
    def section(title, rows):
        nonlocal y
        pdf.set_xy(15, y)
        pdf.set_fill_color(226, 232, 240)
        pdf.set_font("Helvetica", "B", 11)
        pdf.cell(180, 8, title, ln=1, fill=True)
        y += 10
        pdf.set_font("Helvetica", "", 10)
        for label, value in rows:
            pdf.set_xy(15, y)
            pdf.cell(120, 7, label)
            pdf.set_font("Helvetica", "B", 10)
            pdf.cell(60, 7, str(value), align="R", ln=1)
            pdf.set_font("Helvetica", "", 10)
            y += 7
        y += 5
    section("Nilai Tugas Terstruktur", [
        ("Total Submisi", report["assignments"]["count"]),
        ("Sudah Dinilai", report["assignments"]["graded"]),
        ("Rata-rata Nilai", report["assignments"]["avg"] if report["assignments"]["avg"] is not None else "-"),
    ])
    section("Prestasi Mini-Quiz", [
        ("Total Attempt", report["quizzes"]["count"]),
        ("Rata-rata Skor", f"{report['quizzes']['avg_percent']}%" if report["quizzes"]["avg_percent"] is not None else "-"),
    ])
    section("Rekap Presensi", [
        ("Hadir", f"{report['attendance']['hadir']} hari"),
        ("Izin", f"{report['attendance']['izin']} hari"),
        ("Sakit", f"{report['attendance']['sakit']} hari"),
        ("Alpa", f"{report['attendance']['alpa']} hari"),
    ])
    # Footer
    pdf.set_y(-25)
    pdf.set_font("Helvetica", "I", 8)
    pdf.set_text_color(100, 116, 139)
    pdf.cell(0, 5, f"Digenerasi otomatis oleh SEKOLAHKU pada {report['generated_at']}", align="C", ln=1)
    pdf.cell(0, 5, "Silakan hubungi wali kelas untuk klarifikasi lebih lanjut.", align="C")
    out = pdf.output(dest="S")
    return bytes(out) if not isinstance(out, bytes) else out

@api.get("/reports/batch/zip")
async def batch_reports(kelas: str, user=Depends(require_roles("guru","kepsek","super_admin"))):
    students = await db.users.find({"role": "siswa", "kelas": kelas}, {"password_hash": 0, "_id": 0}).to_list(500)
    if not students: raise HTTPException(404, "Tidak ada siswa di kelas ini")
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for s in students:
            report = await build_report(s["id"])
            pdf_bytes = build_pdf(report)
            safe = "".join(c for c in s["name"] if c.isalnum() or c in " -_").strip().replace(" ", "_")
            zf.writestr(f"Rapor_{safe}_{s.get('nisn','')}.pdf", pdf_bytes)
    buf.seek(0)
    fname = f"Rapor_{kelas.replace(' ','_')}.zip"
    return StreamingResponse(buf, media_type="application/zip",
                             headers={"Content-Disposition": f'attachment; filename="{fname}"'})

@api.get("/social-fund/export")
async def export_sf(user=Depends(get_current_user)):
    docs = await db.social_fund.find({}, {"_id": 0}).sort("created_at", -1).to_list(5000)
    columns = ["Tanggal", "Sumber/Kelas", "Tipe", "Jumlah (Rp)", "Keterangan", "Dicatat Oleh"]
    rows = [{"Tanggal": d.get("created_at","")[:10], "Sumber/Kelas": d.get("kelas") or "-",
             "Tipe": (d.get("type") or "").upper(), "Jumlah (Rp)": f"{d.get('amount',0):,.0f}",
             "Keterangan": d.get("note") or "-", "Dicatat Oleh": d.get("recorded_by") or "-"} for d in docs]
    masuk = sum(d.get("amount",0) for d in docs if d.get("type")=="masuk")
    keluar = sum(d.get("amount",0) for d in docs if d.get("type")=="keluar")
    summary = {"Total Transaksi": len(docs),
               "Pemasukan (Rp)": f"{masuk:,.0f}",
               "Pengeluaran (Rp)": f"{keluar:,.0f}",
               "Saldo Akhir (Rp)": f"{masuk-keluar:,.0f}"}
    data = pretty_excel("Laporan Dana Sosial OSIS",
                        f"Diekspor oleh {user['name']} pada {now_iso()[:19].replace('T',' ')}",
                        columns, rows, summary, "Dana Sosial")
    return xlsx_response(data, "Dana_Sosial_OSIS.xlsx")

@api.get("/kas/export")
async def export_kas(kelas: Optional[str] = None, user=Depends(get_current_user)):
    q = {}
    if kelas: q["kelas"] = kelas
    docs = await db.uang_kas.find(q, {"_id": 0}).sort("created_at", -1).to_list(5000)
    columns = ["Tanggal", "Kelas", "Tipe", "Jumlah (Rp)", "Keterangan", "Dicatat Oleh"]
    rows = [{"Tanggal": d.get("created_at","")[:10], "Kelas": d.get("kelas") or "-",
             "Tipe": (d.get("type") or "").upper(), "Jumlah (Rp)": f"{d.get('amount',0):,.0f}",
             "Keterangan": d.get("note") or "-", "Dicatat Oleh": d.get("recorded_by") or "-"} for d in docs]
    masuk = sum(d.get("amount",0) for d in docs if d.get("type")=="masuk")
    keluar = sum(d.get("amount",0) for d in docs if d.get("type")=="keluar")
    summary = {"Total Transaksi": len(docs),
               "Pemasukan (Rp)": f"{masuk:,.0f}",
               "Pengeluaran (Rp)": f"{keluar:,.0f}",
               "Saldo Kas (Rp)": f"{masuk-keluar:,.0f}"}
    data = pretty_excel(f"Laporan Uang Kas {kelas or 'Semua Kelas'}",
                        f"Diekspor oleh {user['name']} pada {now_iso()[:19].replace('T',' ')}",
                        columns, rows, summary, "Uang Kas")
    return xlsx_response(data, f"Uang_Kas_{(kelas or 'all').replace(' ','_')}.xlsx")

@api.get("/inventory/export")
async def export_inventory(user=Depends(get_current_user)):
    docs = await db.inventory.find({}, {"_id": 0}).to_list(1000)
    columns = ["Nama Barang", "Kategori", "Stok", "Kondisi", "Dibuat"]
    rows = [{"Nama Barang": d.get("name"), "Kategori": d.get("category") or "-",
             "Stok": d.get("stock",0), "Kondisi": d.get("condition") or "-",
             "Dibuat": d.get("created_at","")[:10]} for d in docs]
    summary = {"Total Item": len(docs), "Total Stok": sum(d.get("stock",0) for d in docs)}
    data = pretty_excel("Laporan Inventaris Sekolah",
                        f"Diekspor oleh {user['name']} pada {now_iso()[:19].replace('T',' ')}",
                        columns, rows, summary, "Inventaris")
    return xlsx_response(data, "Inventaris_Sekolah.xlsx")

@api.get("/users/export")
async def export_users(role: Optional[str] = None, user=Depends(require_roles("super_admin","kepsek"))):
    q = {"role": role} if role else {}
    docs = await db.users.find(q, {"password_hash": 0, "_id": 0}).to_list(2000)
    columns = ["Nama", "Email", "Role", "Kelas", "NISN", "Ortu (Nama)", "Ortu (Email)", "Bergabung"]
    rows = [{"Nama": d.get("name"), "Email": d.get("email"), "Role": d.get("role"),
             "Kelas": d.get("kelas") or "-", "NISN": d.get("nisn") or "-",
             "Ortu (Nama)": d.get("parent_name") or "-", "Ortu (Email)": d.get("parent_email") or "-",
             "Bergabung": d.get("created_at","")[:10]} for d in docs]
    summary = {"Total Akun": len(docs)}
    data = pretty_excel(f"Daftar Akun {(role or 'Semua Role').upper()}",
                        f"Diekspor oleh {user['name']} pada {now_iso()[:19].replace('T',' ')}",
                        columns, rows, summary, "Akun")
    return xlsx_response(data, f"Akun_{role or 'semua'}.xlsx")

# ---------------- PPDB (Public Registration) ----------------
class PpdbIn(BaseModel):
    full_name: str
    nisn: Optional[str] = None
    birth_place: Optional[str] = None
    birth_date: Optional[str] = None
    gender: str = "L"
    address: str
    phone: str
    parent_name: str
    parent_phone: str
    parent_email: EmailStr
    prev_school: str
    nem_avg: float = Field(ge=0, le=100)
    jurusan_pilihan: str = "IPA"
    berkas_urls: List[str] = []
    photo_url: Optional[str] = None

@api.post("/ppdb/upload")
async def ppdb_upload(file: UploadFile = File(...)):
    """PUBLIC endpoint - no auth. For upload of berkas + photo by calon siswa."""
    ext = (file.filename or "bin").rsplit(".", 1)[-1].lower()
    if ext not in ["jpg","jpeg","png","pdf","webp"]:
        raise HTTPException(400, "Format harus JPG/PNG/PDF")
    ct = file.content_type or MIME.get(ext, "application/octet-stream")
    path = f"{APP_NAME}/ppdb/{uuid.uuid4()}.{ext}"
    data = await file.read()
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(400, "File maksimal 5MB")
    result = put_object(path, data, ct)
    # Save a file record without owner
    await db.files.insert_one({"id": str(uuid.uuid4()), "storage_path": result["path"],
                                "content_type": ct, "size": len(data), "owner_id": None,
                                "is_deleted": False, "public": True, "created_at": now_iso()})
    return {"path": result["path"], "url": f"/api/files/{result['path']}"}

@api.get("/ppdb/public/files/{path:path}")
async def public_download(path: str):
    """Public read for PPDB uploaded files (for admin review preview links)."""
    rec = await db.files.find_one({"storage_path": path, "is_deleted": False})
    if not rec: raise HTTPException(404, "File tidak ditemukan")
    data, ct = get_object(path)
    return Response(content=data, media_type=rec.get("content_type", ct))

@api.post("/ppdb/register")
async def ppdb_register(body: PpdbIn):
    doc = {"id": str(uuid.uuid4()), **body.model_dump(),
           "status": "pending", "score": None, "notes": None,
           "created_at": now_iso()}
    await db.ppdb.insert_one(doc); doc.pop("_id", None)
    # Notify all admin/kepsek
    admins = [u["id"] for u in await db.users.find({"role": {"$in": ["super_admin","kepsek","staff_tu"]}}, {"id": 1}).to_list(50)]
    await notify(admins, f"📥 Pendaftar PPDB Baru", f"{body.full_name} dari {body.prev_school} (NEM {body.nem_avg})", "/admin-ppdb")
    return {"ok": True, "id": doc["id"], "message": "Pendaftaran berhasil! Nomor pendaftaran: " + doc["id"][:8].upper()}

@api.get("/ppdb")
async def list_ppdb(user=Depends(require_roles("super_admin","kepsek","staff_tu"))):
    return await db.ppdb.find({}, {"_id": 0}).sort("created_at", -1).to_list(2000)

@api.get("/ppdb/{pid}")
async def get_ppdb(pid: str, user=Depends(require_roles("super_admin","kepsek","staff_tu"))):
    doc = await db.ppdb.find_one({"id": pid}, {"_id": 0})
    if not doc: raise HTTPException(404, "Tidak ditemukan")
    return doc

@api.patch("/ppdb/{pid}")
async def update_ppdb(pid: str, status: Optional[str] = None, notes: Optional[str] = None, score: Optional[float] = None,
                     user=Depends(require_roles("super_admin","kepsek","staff_tu"))):
    upd = {}
    if status: upd["status"] = status
    if notes is not None: upd["notes"] = notes
    if score is not None: upd["score"] = score
    upd["updated_at"] = now_iso()
    await db.ppdb.update_one({"id": pid}, {"$set": upd})
    return {"ok": True}

@api.post("/ppdb/auto-select")
async def ppdb_auto_select(threshold: float = 75.0, capacity: int = 100,
                            user=Depends(require_roles("super_admin","kepsek"))):
    """Auto-seleksi: NEM >= threshold, sortir berdasarkan skor tertinggi, ambil sampai capacity."""
    all_p = await db.ppdb.find({"status": {"$in": ["pending", "review"]}}, {"_id": 0}).to_list(5000)
    scored = sorted(all_p, key=lambda x: -x.get("nem_avg", 0))
    accepted = 0
    for p in scored:
        nem = p.get("nem_avg", 0)
        if nem >= threshold and accepted < capacity:
            await db.ppdb.update_one({"id": p["id"]}, {"$set": {"status": "lolos", "score": nem, "updated_at": now_iso()}})
            accepted += 1
        else:
            await db.ppdb.update_one({"id": p["id"]}, {"$set": {"status": "tidak_lolos", "score": nem, "updated_at": now_iso()}})
    return {"accepted": accepted, "rejected": len(scored) - accepted, "threshold": threshold, "capacity": capacity}

@api.get("/ppdb/export/xlsx")
async def ppdb_export(user=Depends(require_roles("super_admin","kepsek","staff_tu"))):
    docs = await db.ppdb.find({}, {"_id": 0}).sort("created_at", -1).to_list(5000)
    columns = ["Nama", "NISN", "Asal Sekolah", "NEM", "Jurusan", "Ortu", "HP Ortu", "Email Ortu", "Status", "Daftar"]
    rows = [{"Nama": d.get("full_name"), "NISN": d.get("nisn") or "-",
             "Asal Sekolah": d.get("prev_school"), "NEM": d.get("nem_avg"),
             "Jurusan": d.get("jurusan_pilihan"), "Ortu": d.get("parent_name"),
             "HP Ortu": d.get("parent_phone"), "Email Ortu": d.get("parent_email"),
             "Status": (d.get("status") or "").upper(), "Daftar": d.get("created_at","")[:10]} for d in docs]
    from collections import Counter
    st = Counter(d.get("status") for d in docs)
    summary = {"Total Pendaftar": len(docs), "LOLOS": st.get("lolos",0),
               "TIDAK LOLOS": st.get("tidak_lolos",0), "PENDING": st.get("pending",0)}
    data = pretty_excel("Laporan PPDB - Penerimaan Peserta Didik Baru",
                        f"Diekspor oleh {user['name']} pada {now_iso()[:19].replace('T',' ')}",
                        columns, rows, summary, "PPDB")
    return xlsx_response(data, "PPDB_Rekap.xlsx")

# ---------------- STARTUP ----------------
@app.on_event("startup")
async def startup():
    init_storage()
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.users.create_index("qr_code")
    await db.attendance.create_index([("student_id", 1), ("date", 1)])
    await db.notifications.create_index([("user_id", 1), ("created_at", -1)])
    await db.password_reset_tokens.create_index("token_hash", unique=True)
    await db.password_reset_requests.create_index("created_at", expireAfterSeconds=900)
    await get_settings()  # ensure default settings row exists
    await _seed()

# ---------------- SETTINGS ENDPOINTS ----------------
class SettingsIn(BaseModel):
    school_name: Optional[str] = None
    school_full_name: Optional[str] = None
    school_address: Optional[str] = None
    school_logo_url: Optional[str] = None
    id_card_valid_years: Optional[str] = None
    id_card_rules: Optional[List[str]] = None
    footer_text: Optional[str] = None
    primary_color: Optional[str] = None
    about: Optional[str] = None
    vision: Optional[str] = None
    mission: Optional[List[str]] = None
    history: Optional[str] = None
    principal_name: Optional[str] = None
    established_year: Optional[str] = None
    npsn: Optional[str] = None
    accreditation: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    contact_website: Optional[str] = None
    hero_image_url: Optional[str] = None

@api.get("/settings")
async def api_get_settings():
    """Public: read settings so login page / KTP can render school name/logo."""
    return await get_settings()

@api.patch("/settings")
async def api_update_settings(body: SettingsIn, user=Depends(require_roles("super_admin"))):
    upd = {k: v for k, v in body.model_dump().items() if v is not None}
    if not upd: raise HTTPException(400, "Tidak ada perubahan")
    await db.settings.update_one({"_id": "singleton"}, {"$set": upd}, upsert=True)
    return await get_settings()

async def _seed():
    admin_email = os.environ.get("ADMIN_EMAIL", "boassibarani123@gmail.com").lower()
    admin_pw = os.environ.get("ADMIN_PASSWORD", "Boas12345io")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        uid = str(uuid.uuid4())
        await db.users.insert_one({
            "id": uid, "email": admin_email, "password_hash": hash_pw(admin_pw),
            "name": "Boas Sibarani", "role": "super_admin",
            "qr_code": f"SEKOLAHKU-{uid}", "created_at": now_iso(),
        })
        logger.info(f"Super admin seeded: {admin_email}")
    elif existing["role"] != "super_admin":
        await db.users.update_one({"email": admin_email}, {"$set": {"role": "super_admin"}})

    # Remove legacy demo accounts (keep only real accounts)
    demo_emails = [
        "cassandramarsada@gmail.com", "kepsek@sekolahku.id", "tu@sekolahku.id",
        "guru@sekolahku.id", "siswa@sekolahku.id", "ketuaosis@sekolahku.id", "ketuakelas@sekolahku.id",
    ]
    await db.users.delete_many({"email": {"$in": demo_emails}})

app.include_router(api)

@app.on_event("shutdown")
async def shutdown():
    client.close()
