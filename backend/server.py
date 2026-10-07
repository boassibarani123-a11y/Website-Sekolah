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
import hmac
import random
import bcrypt
import jwt
import httpx
import requests
import pandas as pd
from html import escape
from urllib.parse import urlparse, urlencode
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Any
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, UploadFile, File, Header, Query, BackgroundTasks
from fastapi.responses import StreamingResponse, RedirectResponse
import re
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, field_validator, model_validator
from email_guard import assert_safe_email, EMAIL_BASE_URL

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']
JWT_SECRET = os.environ['JWT_SECRET']
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
JWT_ALGO = "HS256"

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="SMA NEGERI 1 LAGUBOTI API")
api = APIRouter(prefix="/api")

# ---------------- FILE STORAGE (local disk) ----------------
# File disimpan di DISK LOKAL server sehingga aplikasi berjalan di mana saja
# (termasuk VPS) TANPA layanan object-storage eksternal/terkelola apa pun.
# Set env UPLOAD_DIR ke folder persisten (mis. /var/www/uploads) saat di VPS.
UPLOAD_DIR = os.path.abspath(
    os.environ.get("UPLOAD_DIR") or os.path.join(os.path.dirname(__file__), "uploads")
)
os.makedirs(UPLOAD_DIR, exist_ok=True)

MIME = {"jpg":"image/jpeg","jpeg":"image/jpeg","png":"image/png","gif":"image/gif","webp":"image/webp","pdf":"application/pdf"}

def _safe_fs_path(path: str) -> str:
    """Resolve a storage path under UPLOAD_DIR, blocking path traversal."""
    full = os.path.abspath(os.path.join(UPLOAD_DIR, path))
    if full != UPLOAD_DIR and not full.startswith(UPLOAD_DIR + os.sep):
        raise HTTPException(400, "Path file tidak valid")
    return full

def put_object(path: str, data: bytes, content_type: str) -> dict:
    full = _safe_fs_path(path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, "wb") as f:
        f.write(data)
    return {"path": path, "size": len(data)}

def get_object(path: str):
    full = _safe_fs_path(path)
    if not os.path.exists(full):
        raise HTTPException(404, "File tidak ditemukan")
    ext = full.rsplit(".", 1)[-1].lower() if "." in full else ""
    ct = MIME.get(ext, "application/octet-stream")
    with open(full, "rb") as f:
        return f.read(), ct

APP_NAME = "sekolahku"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

# ---------------- SCHOOL SETTINGS ----------------
DEFAULT_SETTINGS = {
    "school_name": "SMA NEGERI 1 LAGUBOTI",
    "school_full_name": "SMA NEGERI 1 LAGUBOTI",
    "school_address": "Jl. Sekolah No. 3, Pasar Laguboti, Kec. Laguboti, Kab. Toba 22381",
    "school_logo_url": "/school-logo.png",
    "gallery_images": [],
    "id_card_valid_years": "2025 - 2028",
    "id_card_rules": [
        "Kartu ini wajib dibawa selama berada di lingkungan sekolah.",
        "Digunakan untuk presensi QR & peminjaman inventaris.",
        "Apabila hilang/rusak, segera lapor ke Tata Usaha."
    ],
    "footer_text": "Sistem Manajemen Sekolah Terpadu",
    "primary_color": "#0284C7",
    "academic_year": "2026/2027",
    # ---- Editable login page text ----
    "login_badge": "SISTEM MANAJEMEN SEKOLAH TERPADU",
    "login_headline": "Satu Platform.\nTujuh Peran.\nSekolah Modern.",
    "login_description": "Absensi QR, Schoolgram, Inventaris, Tugas & Quiz, Uang Kas, Dana Sosial, Pemilu OSIS, dan Kartu Pelajar cetak KTP — semuanya dalam satu dashboard elegan.",
    "login_welcome_title": "Masuk ke Akun Anda",
    "login_welcome_subtitle": "Gunakan email dan password yang diberikan oleh Super Admin sekolah.",
    "login_footer": "© 2026 SMA NEGERI 1 LAGUBOTI · Version 1.0",
    # ---- School info (Informasi Sekolah) ----
    "about": "SMA Negeri 1 Laguboti adalah sekolah menengah atas negeri yang berdiri sejak tahun 1966 di Pasar Laguboti, Kabupaten Toba, Sumatera Utara. Terakreditasi A, sekolah ini berkomitmen mewujudkan lulusan yang beriman, berkarakter, berprestasi, dan berwawasan lingkungan melalui semangat kasih, kolaborasi, kepedulian, dan keikhlasan.",
    "vision": "TERWUJUDNYA LULUSAN YANG BERIMAN, BERKARAKTER, BERPRESTASI DAN BERWAWASAN LINGKUNGAN MELALUI KASIH, KOLABORASI, KEPERDULIAN DAN KEIKHLASAN.",
    "mission": [
        "Melaksanakan aktivitas keimanan dan ketaqwaan kepada Tuhan Yang Maha Esa serta berakhlak mulia.",
        "Melaksanakan pendidikan karakter sesuai dengan nilai-nilai Pancasila, delapan dimensi profil lulusan dan Tujuh Kebiasaan Anak Indonesia Hebat.",
        "Menunjukkan disiplin sebagai pola tingkah laku di sekolah dan masyarakat.",
        "Melaksanakan pembelajaran dengan pendekatan pembelajaran mendalam.",
        "Menunjukkan budaya berprestasi di lingkungan warga sekolah dan masyarakat.",
        "Melaksanakan pendidikan keluarga di sekolah.",
        "Meningkatkan kegiatan kepedulian sosial di lingkungan sekolah dan masyarakat.",
        "Melaksanakan kegiatan pelestarian dan pengembangan budaya daerah dan nasional.",
        "Melaksanakan kegiatan ekstrakurikuler untuk meningkatkan kecakapan hidup.",
        "Melaksanakan penataan sarana prasarana sekolah untuk mendukung sekolah sehat, indah, hijau, dan nyaman bagi warga sekolah.",
        "Menumbuhkan kewirausahaan di sekolah berbasis lingkungan.",
        "Membudayakan sekolah melayani, mandiri, tertib, bersatu dan bersih.",
        "Menumbuhkan rasa solidaritas, loyalitas, kolaborasi, esprit de corps (jiwa korsa).",
    ],
    "history": "Awal berdirinya SMA Negeri 1 Laguboti pada tahun 1966 adalah momen lahirnya ide mewujudkan kepedulian terhadap pendidikan secara umum dan pendidikan generasi muda di Laguboti. Putera/i terbaik bangsa yang berasal dari Laguboti sepakat membangun pendidikan di Bona Pasogit (tempat asal) dengan cara merekrut siswa terbaik dalam akademis dari setiap SLTP yang berada dalam jajaran wilayah Toba Samosir. Sejak TP. 1966 sampai dengan sekarang SMA Negeri 1 Laguboti menerima siswa baru melalui jalur seleksi sekolah.",
    "history_periods": [
        "1966 s.d 1983 : Drs. T.A. Silaen",
        "1983 s.d 1993 : Baginda Pipin Silaen",
        "1993 s.d 1995 : Drs. Chaspar Sinaga",
        "1995 s.d 1997 : Drs. Saut Halomoan Hutagaol",
        "1998 s.d 1999 : Nurmala Hutauruk",
        "2000 s.d 2002 : Drs. Dumpang Sarumpaet",
        "2002 s.d 2004 : Drs. Mochtar Sihotang",
        "2004 s.d 2006 : Drs. Hasonangan",
        "2006 s.d 2008 : Jasa Pembangunan Sitorus, S.Pd",
        "2008 s.d 2010 : Drs. Mochtar Sihotang",
        "2011 s.d Februari 2014 : Drs. Lambok Simanjuntak",
        "Maret 2014 : Beduan Siahaan, S.Pd",
        "November 2014 s.d 2022 : Jelarwin Dabutar, S.Pd, M.Pd",
        "2022 s.d sekarang : Togar D. Panjaitan, S.Pd., M.Si.",
    ],
    "goals": [
        "Terlaksananya aktivitas keimanan dan ketaqwaan kepada Tuhan Yang Maha Esa serta berakhlak mulia.",
        "Terbentuknya sifat disiplin sebagai pola tingkah laku di sekolah dan masyarakat.",
        "Terlaksananya pendidikan karakter sesuai dengan nilai-nilai Pancasila.",
        "Terlaksananya delapan dimensi profil lulusan.",
        "Terlaksananya Tujuh Kebiasaan Anak Indonesia Hebat.",
        "Terlaksananya pembelajaran dengan pendekatan PAIKEM (Saintifik, Proses, Kontekstual, Proyek, Berbasis Masalah, Design Thinking, STEAM, SETS) berbasis IPTEKS dan Keunggulan Lokal.",
        "Terlaksananya 4C (Communication, Collaboration, Critical Thinking & Problem Solving, Creativity & Innovation), numerasi, dan literasi dalam pembelajaran.",
        "Terlaksananya pembelajaran eksplorasi, konfirmasi, dan elaborasi yang mendukung pembelajaran aktif.",
        "Memanfaatkan teknologi digital dalam sistem informasi sekolah dan pembelajaran.",
        "Terbentuknya budaya berprestasi di lingkungan warga sekolah dan masyarakat.",
        "Terlaksananya pendidikan keluarga di sekolah.",
        "Terlaksananya kegiatan kepedulian sosial di lingkungan sekolah dan masyarakat.",
        "Terlaksananya kegiatan pelestarian dan pengembangan budaya daerah dan nasional.",
        "Terlaksananya kegiatan kokurikuler & ekstrakurikuler untuk meningkatkan kecakapan hidup.",
        "Tertatanya sarana prasarana sekolah untuk mendukung sekolah adiwiyata, sehat, indah, hijau, dan nyaman.",
        "Terlaksananya kewirausahaan di sekolah berbasis lingkungan.",
        "Terlaksananya pelayanan sekolah yang melayani, mandiri, tertib, bersatu dan bersih.",
        "Terlaksananya program sekolah dengan kolaborasi, solidaritas, loyalitas, kerjasama, dan esprit de corps (jiwa korsa).",
    ],
    "environment": [
        "Lingkungan sekolah bersih dan sehat.",
        "Memiliki landscape (pemanfaatan RTH).",
        "Memanfaatkan sumber daya dan energi secara efisien (listrik, air, ATK, BBM).",
        "Mengelola sampah (4R = Reduce, Reuse, Recycle, Replace).",
        "Mengelola sanitasi lingkungan dan memiliki cadangan air tanah.",
        "Memiliki kantin ramah lingkungan.",
        "Melakukan pelestarian fungsi lingkungan hidup.",
    ],
    "goals_short": [
        "Meningkatkan status sekolah menjadi Sekolah Standar Nasional.",
        "Meningkatkan 20% siswa untuk bersaing memasuki perguruan tinggi negeri.",
        "Meningkatkan kemampuan bersaing dalam olimpiade mata pelajaran tingkat kabupaten, provinsi, dan nasional.",
        "Meningkatkan prestasi bidang olahraga dan seni hingga tingkat nasional dan internasional.",
        "Meningkatkan 20% pembelajaran berbasis TIK.",
        "Meningkatkan 90% administrasi melalui komputerisasi.",
        "Menciptakan lingkungan sekolah yang indah, bersih, dan sehat.",
        "Memenangkan lomba sekolah sehat dan berwawasan lingkungan tingkat kecamatan, kabupaten, provinsi, dan nasional.",
        "Membangun iklim persaudaraan yang erat antar warga sekolah.",
        "Meningkatkan kedisiplinan dan jiwa kepemimpinan siswa.",
        "Meningkatkan jiwa kewirausahaan dan kemandirian siswa.",
        "Pengadaan fasilitas ruang IT pembelajaran sekolah.",
    ],
    "goals_medium": [
        "Rata-rata nilai UN/US mencapai 7,5.",
        "Jumlah lulusan yang melanjut ke PTN minimal 50%.",
        "Memiliki tim olahraga minimal 2 cabang yang mampu bersaing di tingkat kabupaten, provinsi, dan nasional.",
        "Memiliki tim kesenian yang mampu tampil pada acara tingkat kabupaten, provinsi, dan nasional.",
        "Mampu mengembangkan potensi sumber daya alam daerah.",
        "Mampu menjadi tenaga semi profesional berbasis IT di tingkat kabupaten.",
    ],
    "goals_long": [
        "Meningkatkan status sekolah menjadi Sekolah Standar Nasional Berbasis Keunggulan Lokal.",
        "Meningkatkan pelaksanaan pembelajaran berbasis TIK hingga 85%.",
        "Melengkapi sarana prasarana dan sumber belajar sesuai standar.",
        "Meningkatkan kemampuan siswa bidang akademik dan non-akademik untuk bersaing di tingkat kabupaten, provinsi, dan nasional.",
    ],
    "targets": [
        "Memiliki kebiasaan penerapan nilai-nilai disiplin dan agama.",
        "Rata-rata nilai UN/US minimal mencapai 7,5.",
        "Memiliki kemampuan bersaing pada lomba tingkat kabupaten dan provinsi.",
        "Jumlah lulusan yang melanjut ke PTN minimal 50%.",
        "Kemampuan menggunakan IT bagi warga sekolah minimal 50%.",
        "Memiliki tim olahraga dan tim kesenian yang rutin berlatih dan pentas di sekolah.",
        "Memiliki keterampilan berbasis keunggulan lokal untuk menopang pemberdayaan ekonomi lokal.",
        "Menjadi sekolah berbudaya lingkungan dan sekolah adiwiyata.",
    ],
    # ---- Profile facts ----
    "principal_name": "Togar Duharman Panjaitan, S.Pd., M.Si.",
    "principal_education": "S2",
    "principal_major": "Biologi",
    "principal_sk_date": "26 Oktober 2010",
    "principal_training": "Seleksi calon kepala sekolah 31 Juli s/d 1 Agustus 2006 dengan predikat lulus dan Baik.",
    "established_year": "1966",
    "nss": "301070818006",
    "npsn": "10208460",
    "land_area": "3.444 m²",
    "accreditation": "A — No. 694/BAP-SM/PROVSU/LL/XI/2017 (18 November 2017, BAN)",
    "sk_pendirian": "190/B/III/1967",
    "sk_instansi": "Kanwil Departemen Pendidikan dan Kebudayaan Provinsi Sumatera Utara",
    "address_street": "Jalan Sekolah No. 3",
    "address_village": "Pasar Laguboti",
    "address_district": "Laguboti",
    "address_regency": "Toba",
    "address_postal": "22381",
    "contact_phone": "0632 – 331512",
    "contact_email": "smanegeri1laguboti@yahoo.co.id",
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
from openpyxl.worksheet.page import PageMargins

SKY_600 = "0284C7"
SKY_100 = "E0F2FE"
SLATE_900 = "0F172A"
SLATE_50 = "F8FAFC"

def _border(color="CBD5E1"):
    s = Side(style="thin", color=color)
    return Border(left=s, right=s, top=s, bottom=s)

def pretty_excel(title: str, subtitle: str, columns: list, rows: list,
                 summary: Optional[dict] = None, sheet_name: str = "Laporan",
                 brand: str = "SMA NEGERI 1 LAGUBOTI") -> bytes:
    """Branded Excel report with a clean whitespace margin around the content block.
    Unified theme (sky title bar, slate meta bar, zebra rows, connected summary bands)."""
    wb = Workbook()
    ws = wb.active
    ws.title = sheet_name[:31]
    CO = 2  # content starts at column B (column A = left margin)
    n_cols = len(columns)
    first_col = get_column_letter(CO)
    last_col = get_column_letter(CO + n_cols - 1)

    # Edge margins (whitespace gap around the table)
    ws.column_dimensions["A"].width = 2.6
    ws.column_dimensions[get_column_letter(CO + n_cols)].width = 2.6
    ws.row_dimensions[1].height = 12

    # Title row (row 2)
    tr = 2
    ws.merge_cells(f"{first_col}{tr}:{last_col}{tr}")
    c = ws.cell(row=tr, column=CO, value=f"{brand}  -  {title}")
    c.font = Font(name="Calibri", size=16, bold=True, color="FFFFFF")
    c.fill = PatternFill("solid", fgColor=SKY_600)
    c.alignment = Alignment(horizontal="left", vertical="center", indent=1)
    ws.row_dimensions[tr].height = 34

    # Subtitle row (row 3)
    ws.merge_cells(f"{first_col}{tr+1}:{last_col}{tr+1}")
    c2 = ws.cell(row=tr + 1, column=CO, value=subtitle)
    c2.font = Font(name="Calibri", size=10, italic=True, color="FFFFFF")
    c2.fill = PatternFill("solid", fgColor=SLATE_900)
    c2.alignment = Alignment(horizontal="left", vertical="center", indent=1)
    ws.row_dimensions[tr + 1].height = 22

    # Spacer (row 4)
    ws.row_dimensions[tr + 2].height = 8

    # Header row (row 5)
    hdr_row = tr + 3
    for i in range(n_cols):
        cell = ws.cell(row=hdr_row, column=CO + i, value=columns[i])
        cell.font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
        cell.fill = PatternFill("solid", fgColor=SKY_600)
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = _border("FFFFFF")
    ws.row_dimensions[hdr_row].height = 30

    # Data rows (or placeholder when empty)
    if not rows:
        r = hdr_row + 1
        ws.merge_cells(start_row=r, start_column=CO, end_row=r, end_column=CO + n_cols - 1)
        e = ws.cell(row=r, column=CO, value="Belum ada data untuk ditampilkan.")
        e.font = Font(name="Calibri", size=10, italic=True, color="94A3B8")
        e.alignment = Alignment(horizontal="center", vertical="center")
        for ci in range(n_cols):
            ws.cell(row=r, column=CO + ci).border = _border()
        ws.row_dimensions[r].height = 24
    for ri, row in enumerate(rows):
        r = hdr_row + 1 + ri
        fill = PatternFill("solid", fgColor=SLATE_50) if ri % 2 == 0 else None
        for ci in range(n_cols):
            key = columns[ci]
            val = row.get(key) if isinstance(row, dict) else row[ci]
            cell = ws.cell(row=r, column=CO + ci, value=val if val is not None else "-")
            cell.font = Font(name="Calibri", size=10, color=SLATE_900)
            cell.alignment = Alignment(horizontal="left" if ci == 0 else "center", vertical="center", wrap_text=True)
            cell.border = _border()
            if fill: cell.fill = fill
        ws.row_dimensions[r].height = 22

    # Summary section — full-width connected bands, no truncated labels
    if summary:
        gap = hdr_row + max(len(rows), 1) + 2
        ws.merge_cells(start_row=gap, start_column=CO, end_row=gap, end_column=CO + n_cols - 1)
        s = ws.cell(row=gap, column=CO, value="RINGKASAN")
        s.font = Font(bold=True, color="FFFFFF", size=11)
        s.fill = PatternFill("solid", fgColor=SLATE_900)
        s.alignment = Alignment(horizontal="center", vertical="center")
        ws.row_dimensions[gap].height = 24
        split = max(1, n_cols // 2)
        for i, (k, v) in enumerate(summary.items()):
            r = gap + 1 + i
            band = PatternFill("solid", fgColor=SKY_100)
            for ci in range(n_cols):
                cell = ws.cell(row=r, column=CO + ci)
                cell.fill = band
                cell.border = _border()
            if split >= 2:
                ws.merge_cells(start_row=r, start_column=CO, end_row=r, end_column=CO + split - 1)
            kc = ws.cell(row=r, column=CO, value=k)
            kc.font = Font(bold=True, color=SLATE_900, size=10)
            kc.alignment = Alignment(horizontal="left", indent=1, vertical="center")
            if split + 1 <= n_cols:
                ws.merge_cells(start_row=r, start_column=CO + split, end_row=r, end_column=CO + n_cols - 1)
            vc = ws.cell(row=r, column=CO + min(split, n_cols - 1), value=v)
            vc.font = Font(bold=True, color=SKY_600, size=11)
            vc.alignment = Alignment(horizontal="right", indent=1, vertical="center")
            ws.row_dimensions[r].height = 22
        last_content = gap + len(summary)
    else:
        last_content = hdr_row + max(len(rows), 1)
    ws.row_dimensions[last_content + 1].height = 10  # bottom margin

    # Column widths — fit header + data, readable minimum
    for i in range(n_cols):
        lens = [len(str(columns[i]))]
        for r in rows[:150]:
            v = r.get(columns[i]) if isinstance(r, dict) else r[i]
            lens.append(len(str(v if v is not None else "")))
        width = min(max(13, max(lens) + 4), 44)
        if i == 0:
            width = max(width, 18)
        ws.column_dimensions[get_column_letter(CO + i)].width = width

    ws.sheet_view.showGridLines = False
    ws.freeze_panes = f"{first_col}{hdr_row+1}"
    ws.page_margins = PageMargins(left=0.5, right=0.5, top=0.6, bottom=0.6)
    ws.print_options.horizontalCentered = True

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
ROLES = ["super_admin", "kepsek", "staff_tu", "guru", "siswa", "ketua_osis", "ketua_kelas", "admin_perpus"]

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

# ---------------- DEMO ISOLATION ----------------
# Demo accounts operate in a separate sandbox: their created data is tagged
# is_demo=True and is never shown to real users (and vice-versa).
def dscope(user: dict) -> dict:
    return {"is_demo": True} if user.get("is_demo") else {"is_demo": {"$ne": True}}

def dstamp(doc: dict, user: dict) -> dict:
    doc["is_demo"] = bool(user.get("is_demo"))
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
    phone: Optional[str] = None  # nomor WhatsApp (wajib untuk siswa)
    student_id: Optional[str] = None  # for orang_tua linking
    subjects: Optional[List[str]] = None  # mapel yang diampu (guru)

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
    phone: Optional[str] = None
    student_id: Optional[str] = None
    subjects: Optional[List[str]] = None

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
    q = dscope(user)
    if role: q["role"] = role
    users = await db.users.find(q, {"password_hash": 0, "_id": 0}).to_list(1000)
    return users

@api.post("/users")
async def create_user(body: UserCreate, user=Depends(require_roles("super_admin"))):
    if body.role not in ROLES:
        raise HTTPException(400, "Role tidak valid")
    if body.role == "siswa" and not (body.phone or "").strip():
        raise HTTPException(400, "Nomor WhatsApp aktif wajib diisi untuk akun siswa")
    if body.phone and not re.fullmatch(r"\+?[0-9][0-9 ()-]{7,17}", body.phone.strip()):
        raise HTTPException(400, "Format nomor WhatsApp tidak valid (contoh: 081234567890)")
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
        "phone": (body.phone or "").strip() or None,
        "student_id": body.student_id,
        "subjects": body.subjects or [],
        "created_at": now_iso(),
    }
    dstamp(doc, user)
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
    password: Optional[str] = None
    copy_bph_from: Optional[str] = None  # source class id to copy BPH org chart from

class ClassUpdate(BaseModel):
    name: Optional[str] = None
    subjects: Optional[List[str]] = None
    homeroom_teacher_id: Optional[str] = None
    description: Optional[str] = None
    password: Optional[str] = None
    remove_password: Optional[bool] = None

class ClassUnlockIn(BaseModel):
    password: str

CLASS_PROJ = {"_id": 0, "password_hash": 0}

def class_out(c: dict, user: dict) -> dict:
    c["has_password"] = bool(c.pop("password_hash", None))
    c["locked"] = class_locked_flag(c, user)
    return c

def class_locked_flag(c: dict, user: dict) -> bool:
    return c.get("has_password", False) and user.get("role") != "super_admin" \
        and c["id"] not in (user.get("unlocked_classes") or [])

async def locked_class_query(user: dict) -> list:
    if user.get("role") == "super_admin":
        return []
    unlocked = user.get("unlocked_classes") or []
    locked = await db.classes.find({"password_hash": {"$exists": True}, "id": {"$nin": unlocked}, **dscope(user)},
                                   {"_id": 0, "id": 1, "name": 1}).to_list(500)
    if not locked:
        return []
    return [{"class_id": {"$nin": [c["id"] for c in locked]}}, {"kelas": {"$nin": [c["name"] for c in locked]}}]

async def assert_doc_class_unlocked(user: dict, doc: dict):
    klass = None
    if doc.get("class_id"):
        klass = await db.classes.find_one({"id": doc["class_id"]})
    if not klass and doc.get("kelas"):
        klass = await db.classes.find_one({"name": doc["kelas"], **dscope(user)})
    if klass:
        await assert_class_unlocked(user, klass)

async def assert_class_unlocked(user: dict, klass: dict):
    if klass.get("password_hash") and user.get("role") != "super_admin" \
            and klass["id"] not in (user.get("unlocked_classes") or []):
        raise HTTPException(423, "Kelas terkunci. Masukkan password kelas terlebih dahulu")

@api.get("/classes")
async def list_classes(user=Depends(get_current_user)):
    classes = await db.classes.find(dscope(user), {"_id": 0}).sort("name", 1).to_list(500)
    classes = [class_out(c, user) for c in classes]
    # Students & class/osis leaders only see their own class
    if user["role"] in ("siswa", "ketua_kelas", "ketua_osis") and user.get("kelas"):
        classes = [c for c in classes if c.get("name") == user.get("kelas")]
    # Guru only see classes they teach a subject in, or are homeroom of
    if user["role"] == "guru":
        classes = [c for c in classes if guru_can_access_class(user, c)]
    # attach student count + homeroom teacher name
    for c in classes:
        c["student_count"] = await db.users.count_documents({"role": "siswa", "kelas": c["name"], **dscope(user)})
        if c.get("homeroom_teacher_id"):
            t = await db.users.find_one({"id": c["homeroom_teacher_id"]}, {"_id": 0, "name": 1})
            c["homeroom_teacher_name"] = t["name"] if t else None
    return classes

@api.get("/classes/{cid}")
async def get_class(cid: str, user=Depends(get_current_user)):
    c = await db.classes.find_one({"id": cid}, {"_id": 0})
    if not c:
        raise HTTPException(404, "Kelas tidak ditemukan")
    await assert_class_view(user, c)
    c = class_out(c, user)
    if c["locked"]:
        return {k: c.get(k) for k in ("id", "name", "description", "has_password", "locked")}
    if c.get("homeroom_teacher_id"):
        t = await db.users.find_one({"id": c["homeroom_teacher_id"]}, {"_id": 0, "name": 1})
        c["homeroom_teacher_name"] = t["name"] if t else None
    # Flag: can the current user manage uang kas (ketua_kelas of class OR appointed bendahara)?
    c["can_manage_kas"] = (
        (user.get("role") == "ketua_kelas" and user.get("kelas") == c.get("name"))
        or (bool(c.get("treasurer_id")) and user.get("id") == c.get("treasurer_id"))
    )
    c["can_set_treasurer"] = (
        user.get("role") == "super_admin"
        or (user.get("role") == "ketua_kelas" and user.get("kelas") == c.get("name"))
    )
    return c

@api.post("/classes/{cid}/unlock")
async def unlock_class(cid: str, body: ClassUnlockIn, user=Depends(get_current_user)):
    c = await db.classes.find_one({"id": cid})
    await assert_class_view(user, c)
    if c.get("password_hash") and not verify_pw(body.password, c["password_hash"]):
        raise HTTPException(400, "Password kelas salah")
    await db.users.update_one({"id": user["id"]}, {"$addToSet": {"unlocked_classes": cid}})
    return {"ok": True}

def guru_can_access_class(user: dict, klass: dict) -> bool:
    """Guru may access a class if they are its homeroom teacher OR they teach one
    of the subjects defined on the class. Super admin: always."""
    if klass is None:
        return False
    if user.get("role") == "super_admin":
        return True
    if user.get("role") == "guru":
        if klass.get("homeroom_teacher_id") == user["id"]:
            return True
        mine = set(user.get("subjects") or [])
        cls_subjects = set(klass.get("subjects") or [])
        return bool(mine & cls_subjects)
    return False

def can_manage_class(user: dict, klass: dict) -> bool:
    """Only super_admin may create/edit/delete a class (per requirement)."""
    return user.get("role") == "super_admin"

async def assert_class_view(user: dict, klass: Optional[dict]):
    """Enforce who may view/enter a class."""
    if klass is None:
        raise HTTPException(404, "Kelas tidak ditemukan")
    role = user.get("role")
    if role in ("super_admin", "kepsek", "staff_tu"):
        return
    if role == "guru":
        if not guru_can_access_class(user, klass):
            raise HTTPException(403, "Anda tidak mengampu mata pelajaran di kelas ini")
        return
    # siswa / ketua_kelas / ketua_osis / orang_tua -> must belong to the class
    if klass.get("name") != user.get("kelas"):
        raise HTTPException(403, "Anda bukan anggota kelas ini")

async def guru_assert_manages(user: dict, class_id: Optional[str], kelas_name: Optional[str], subject: Optional[str] = None):
    """Guru may only add tugas/quiz to classes they can access (homeroom or teach a
    subject in). If a subject is given, a non-homeroom guru must teach that subject."""
    if user.get("role") == "super_admin":
        return
    klass = None
    if class_id:
        klass = await db.classes.find_one({"id": class_id})
    if not klass and kelas_name:
        klass = await db.classes.find_one({"name": kelas_name, **dscope(user)})
    if not klass or not guru_can_access_class(user, klass):
        raise HTTPException(403, "Anda hanya dapat menambah tugas/quiz pada kelas yang Anda ampu")
    if subject and user.get("role") == "guru" and klass.get("homeroom_teacher_id") != user["id"]:
        if subject not in (user.get("subjects") or []):
            raise HTTPException(403, f"Anda tidak mengampu mata pelajaran {subject}")

@api.post("/classes")
async def create_class(body: ClassIn, user=Depends(require_roles("super_admin"))):
    if await db.classes.find_one({"name": body.name, **dscope(user)}):
        raise HTTPException(400, "Nama kelas sudah ada")
    data = body.model_dump()
    pw = (data.pop("password") or "").strip()
    copy_bph_from = data.pop("copy_bph_from", None)
    doc = {"id": str(uuid.uuid4()), **data, "created_by": user["id"],
           "created_by_name": user["name"], "created_at": now_iso()}
    if pw:
        doc["password_hash"] = hash_pw(pw)
    dstamp(doc, user)
    await db.classes.insert_one(doc)
    doc.pop("_id", None)
    # Optionally copy the BPH org chart from an existing class
    if copy_bph_from:
        src_nodes = await db.class_bph.find({"class_id": copy_bph_from}, {"_id": 0}).sort("order", 1).to_list(2000)
        id_map = {n["id"]: str(uuid.uuid4()) for n in src_nodes}
        new_nodes = []
        for n in src_nodes:
            nn = dict(n)
            nn["id"] = id_map[n["id"]]
            nn["class_id"] = doc["id"]
            if n.get("parent_id"):
                nn["parent_id"] = id_map.get(n["parent_id"])
            nn["is_demo"] = bool(user.get("is_demo"))
            nn["created_at"] = now_iso()
            new_nodes.append(nn)
        if new_nodes:
            await db.class_bph.insert_many(new_nodes)
    return class_out(doc, user)

@api.patch("/classes/{cid}")
async def update_class(cid: str, body: ClassUpdate, user=Depends(require_roles("super_admin"))):
    klass = await db.classes.find_one({"id": cid})
    if not klass:
        raise HTTPException(404, "Kelas tidak ditemukan")
    if not can_manage_class(user, klass):
        raise HTTPException(403, "Anda hanya dapat mengelola kelas milik/wali Anda sendiri")
    upd = {k: v for k, v in body.model_dump().items() if v is not None}
    pw = (upd.pop("password", None) or "").strip()
    if upd.pop("remove_password", None):
        await db.classes.update_one({"id": cid}, {"$unset": {"password_hash": ""}})
        await db.users.update_many({"unlocked_classes": cid}, {"$pull": {"unlocked_classes": cid}})
    elif pw:
        upd["password_hash"] = hash_pw(pw)
        await db.users.update_many({"unlocked_classes": cid}, {"$pull": {"unlocked_classes": cid}})
    if upd:
        await db.classes.update_one({"id": cid}, {"$set": upd})
    return class_out(await db.classes.find_one({"id": cid}, {"_id": 0}), user)

@api.delete("/classes/{cid}")
async def delete_class(cid: str, user=Depends(require_roles("super_admin"))):
    klass = await db.classes.find_one({"id": cid})
    if not klass:
        raise HTTPException(404, "Kelas tidak ditemukan")
    if not can_manage_class(user, klass):
        raise HTTPException(403, "Anda hanya dapat mengelola kelas milik/wali Anda sendiri")
    await db.classes.delete_one({"id": cid})
    return {"ok": True}

# ---------------- ORGANIZATION STRUCTURE (Struktur Organisasi) ----------------
class OrgStructureIn(BaseModel):
    name: str
    subtitle: Optional[str] = None

class OrgStructureUpdate(BaseModel):
    name: Optional[str] = None
    subtitle: Optional[str] = None

class OrgNodeIn(BaseModel):
    name: str
    title: str
    photo: Optional[str] = None
    parent_id: Optional[str] = None
    dashed: bool = False  # dashed connector (advisory roles e.g. Komite)
    order: int = 0
    structure_id: Optional[str] = None

class OrgNodeUpdate(BaseModel):
    name: Optional[str] = None
    title: Optional[str] = None
    photo: Optional[str] = None
    parent_id: Optional[str] = None
    dashed: Optional[bool] = None
    order: Optional[int] = None

# ---------------- ORG STRUCTURES (multiple named charts) ----------------
@api.get("/org-structures")
async def list_org_structures(user=Depends(get_current_user)):
    structures = await db.org_structures.find(dscope(user), {"_id": 0}).sort("created_at", 1).to_list(500)
    for s in structures:
        s["member_count"] = await db.org_nodes.count_documents({"structure_id": s["id"]})
    return structures

@api.get("/org-structures/public")
async def list_org_structures_public():
    return await db.org_structures.find({"is_demo": {"$ne": True}}, {"_id": 0}).sort("created_at", 1).to_list(500)

@api.get("/org-structures/{sid}")
async def get_org_structure(sid: str, user=Depends(get_current_user)):
    s = await db.org_structures.find_one({"id": sid, **dscope(user)}, {"_id": 0})
    if not s:
        raise HTTPException(404, "Struktur tidak ditemukan")
    return s

@api.post("/org-structures")
async def create_org_structure(body: OrgStructureIn, user=Depends(require_roles("super_admin"))):
    if not body.name.strip():
        raise HTTPException(400, "Nama struktur wajib diisi")
    doc = {"id": str(uuid.uuid4()), "name": body.name.strip(), "subtitle": body.subtitle,
           "created_at": now_iso()}
    dstamp(doc, user)
    await db.org_structures.insert_one(doc); doc.pop("_id", None)
    doc["member_count"] = 0
    return doc

@api.patch("/org-structures/{sid}")
async def update_org_structure(sid: str, body: OrgStructureUpdate, user=Depends(require_roles("super_admin"))):
    if not await db.org_structures.find_one({"id": sid, **dscope(user)}):
        raise HTTPException(404, "Struktur tidak ditemukan")
    upd = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    if upd:
        await db.org_structures.update_one({"id": sid}, {"$set": upd})
    return await db.org_structures.find_one({"id": sid}, {"_id": 0})

@api.delete("/org-structures/{sid}")
async def delete_org_structure(sid: str, user=Depends(require_roles("super_admin"))):
    if not await db.org_structures.find_one({"id": sid, **dscope(user)}):
        raise HTTPException(404, "Struktur tidak ditemukan")
    await db.org_nodes.delete_many({"structure_id": sid})
    await db.org_structures.delete_one({"id": sid})
    return {"ok": True}

@api.get("/org")
async def list_org(structure_id: Optional[str] = None, user=Depends(get_current_user)):
    q = dscope(user)
    if structure_id:
        q["structure_id"] = structure_id
    return await db.org_nodes.find(q, {"_id": 0}).sort("order", 1).to_list(2000)

@api.get("/org/public")
async def list_org_public(structure_id: Optional[str] = None):
    """Public read of the real (non-demo) organization chart for visitors."""
    q = {"is_demo": {"$ne": True}}
    if structure_id:
        q["structure_id"] = structure_id
    return await db.org_nodes.find(q, {"_id": 0}).sort("order", 1).to_list(2000)

@api.post("/org")
async def create_org(body: OrgNodeIn, user=Depends(require_roles("super_admin"))):
    if body.structure_id and not await db.org_structures.find_one({"id": body.structure_id, **dscope(user)}):
        raise HTTPException(404, "Struktur tidak ditemukan")
    if body.parent_id and not await db.org_nodes.find_one({"id": body.parent_id, **dscope(user)}):
        raise HTTPException(404, "Atasan (parent) tidak ditemukan")
    doc = {"id": str(uuid.uuid4()), **body.model_dump(), "created_at": now_iso()}
    dstamp(doc, user)
    await db.org_nodes.insert_one(doc); doc.pop("_id", None)
    return doc

@api.patch("/org/{nid}")
async def update_org(nid: str, body: OrgNodeUpdate, user=Depends(require_roles("super_admin"))):
    node = await db.org_nodes.find_one({"id": nid, **dscope(user)})
    if not node:
        raise HTTPException(404, "Anggota tidak ditemukan")
    upd = {k: v for k, v in body.model_dump(exclude_unset=True).items()}
    if "parent_id" in upd and upd["parent_id"]:
        # prevent cycles: new parent must not be the node itself or one of its descendants
        cur, seen = upd["parent_id"], set()
        while cur:
            if cur == nid:
                raise HTTPException(400, "Tidak dapat memindahkan anggota ke dalam bawahannya sendiri")
            if cur in seen:
                break
            seen.add(cur)
            p = await db.org_nodes.find_one({"id": cur}, {"_id": 0, "parent_id": 1})
            cur = p.get("parent_id") if p else None
    if upd:
        await db.org_nodes.update_one({"id": nid}, {"$set": upd})
    return await db.org_nodes.find_one({"id": nid}, {"_id": 0})

@api.delete("/org/{nid}")
async def delete_org(nid: str, user=Depends(require_roles("super_admin"))):
    scope = dscope(user)
    async def _delete_subtree(node_id):
        children = await db.org_nodes.find({"parent_id": node_id, **scope}, {"_id": 0, "id": 1}).to_list(2000)
        for c in children:
            await _delete_subtree(c["id"])
        await db.org_nodes.delete_one({"id": node_id})
    if not await db.org_nodes.find_one({"id": nid, **scope}):
        raise HTTPException(404, "Anggota tidak ditemukan")
    await _delete_subtree(nid)
    return {"ok": True}

# ---------------- CLASS BPH (Badan Pengurus Harian) ----------------
class BphNodeIn(BaseModel):
    name: str
    title: str
    photo: Optional[str] = None
    parent_id: Optional[str] = None
    dashed: bool = False
    order: int = 0

class BphNodeUpdate(BaseModel):
    name: Optional[str] = None
    title: Optional[str] = None
    photo: Optional[str] = None
    parent_id: Optional[str] = None
    dashed: Optional[bool] = None
    order: Optional[int] = None

def assert_bph_manager(user: dict, klass: dict):
    if user.get("role") != "ketua_kelas" or user.get("kelas") != klass.get("name"):
        raise HTTPException(403, "Hanya Ketua Kelas yang dapat mengatur bagan BPH kelas ini")

async def bph_class(cid: str, user: dict) -> dict:
    klass = await db.classes.find_one({"id": cid})
    await assert_class_view(user, klass)
    await assert_class_unlocked(user, klass)
    return klass

@api.get("/classes/{cid}/bph")
async def list_bph(cid: str, user=Depends(get_current_user)):
    await bph_class(cid, user)
    return await db.class_bph.find({"class_id": cid}, {"_id": 0}).sort("order", 1).to_list(2000)

@api.post("/classes/{cid}/bph")
async def create_bph(cid: str, body: BphNodeIn, user=Depends(get_current_user)):
    klass = await bph_class(cid, user)
    assert_bph_manager(user, klass)
    if body.parent_id and not await db.class_bph.find_one({"id": body.parent_id, "class_id": cid}):
        raise HTTPException(404, "Atasan (parent) tidak ditemukan")
    doc = {"id": str(uuid.uuid4()), **body.model_dump(), "class_id": cid, "created_at": now_iso()}
    dstamp(doc, user)
    await db.class_bph.insert_one(doc); doc.pop("_id", None)
    return doc

@api.patch("/classes/{cid}/bph/{nid}")
async def update_bph(cid: str, nid: str, body: BphNodeUpdate, user=Depends(get_current_user)):
    klass = await bph_class(cid, user)
    assert_bph_manager(user, klass)
    if not await db.class_bph.find_one({"id": nid, "class_id": cid}):
        raise HTTPException(404, "Anggota tidak ditemukan")
    upd = {k: v for k, v in body.model_dump(exclude_unset=True).items()}
    if "parent_id" in upd and upd["parent_id"]:
        cur, seen = upd["parent_id"], set()
        while cur:
            if cur == nid:
                raise HTTPException(400, "Tidak dapat memindahkan anggota ke dalam bawahannya sendiri")
            if cur in seen:
                break
            seen.add(cur)
            p = await db.class_bph.find_one({"id": cur, "class_id": cid}, {"_id": 0, "parent_id": 1})
            cur = p.get("parent_id") if p else None
    if upd:
        await db.class_bph.update_one({"id": nid}, {"$set": upd})
    return await db.class_bph.find_one({"id": nid}, {"_id": 0})

@api.delete("/classes/{cid}/bph/{nid}")
async def delete_bph(cid: str, nid: str, user=Depends(get_current_user)):
    klass = await bph_class(cid, user)
    assert_bph_manager(user, klass)
    if not await db.class_bph.find_one({"id": nid, "class_id": cid}):
        raise HTTPException(404, "Anggota tidak ditemukan")
    async def _del(node_id):
        children = await db.class_bph.find({"parent_id": node_id, "class_id": cid}, {"_id": 0, "id": 1}).to_list(2000)
        for c in children:
            await _del(c["id"])
        await db.class_bph.delete_one({"id": node_id})
    await _del(nid)
    return {"ok": True}

# ---------------- ATTENDANCE ----------------
class ScanIn(BaseModel):
    qr_code: Optional[str] = None
    nisn: Optional[str] = None  # manual fallback using student's NISN on the card
    status: str = "hadir"  # hadir | izin | sakit | alpa
    photo: Optional[str] = None  # URL of webcam snapshot for anti-titip proof
    method: str = "qr"  # qr | barcode | manual

@api.post("/attendance/scan")
async def scan(body: ScanIn, user=Depends(require_roles("siswa", "ketua_kelas", "ketua_osis", "staff_tu", "guru", "super_admin"))):
    if body.status not in ["hadir", "izin", "sakit", "alpa"]:
        raise HTTPException(400, "Status tidak valid")
    if body.method not in ("qr", "barcode", "manual"):
        raise HTTPException(400, "Metode tidak valid")
    q = {"role": "siswa", **dscope(user)}
    if body.qr_code and body.qr_code.strip():
        q["qr_code"] = body.qr_code.strip()
    elif body.nisn and body.nisn.strip():
        q["nisn"] = body.nisn.strip()
    else:
        raise HTTPException(400, "QR code atau NISN wajib diisi")
    student = await db.users.find_one(q)
    if not student:
        raise HTTPException(404, "NISN tidak dikenali" if body.nisn else "QR tidak dikenali")
    today = datetime.now(timezone.utc).date().isoformat()
    existing = await db.attendance.find_one({"student_id": student["id"], "date": today})
    if existing:
        upd = {"status": body.status, "scanned_at": now_iso(), "method": body.method}
        if body.photo: upd["photo"] = body.photo
        await db.attendance.update_one({"id": existing["id"]}, {"$set": upd})
        return {"ok": True, "student": strip(student), "status": body.status, "updated": True}
    rec = {"id": str(uuid.uuid4()), "student_id": student["id"], "student_name": student["name"],
           "kelas": student.get("kelas"), "date": today, "status": body.status, "scanned_at": now_iso(),
           "scanned_by": user["name"], "photo": body.photo, "method": body.method, "is_demo": bool(user.get("is_demo"))}
    await db.attendance.insert_one(rec)
    return {"ok": True, "student": strip(student), "status": body.status}

@api.get("/attendance")
async def list_attendance(date: Optional[str] = None, kelas: Optional[str] = None, user=Depends(get_current_user)):
    q = dscope(user)
    if date: q["date"] = date
    if kelas: q["kelas"] = kelas
    rows = await db.attendance.find(q, {"_id": 0}).sort("scanned_at", -1).to_list(2000)
    return rows

@api.get("/attendance/stats")
async def att_stats(date: Optional[str] = None, user=Depends(get_current_user)):
    date = date or datetime.now(timezone.utc).date().isoformat()
    pipeline = [{"$match": {"date": date, **dscope(user)}}, {"$group": {"_id": "$status", "n": {"$sum": 1}}}]
    total_siswa = await db.users.count_documents({"role": "siswa", **dscope(user)})
    agg = await db.attendance.aggregate(pipeline).to_list(100)
    out = {"hadir": 0, "izin": 0, "sakit": 0, "alpa": 0}
    for r in agg: out[r["_id"]] = r["n"]
    out["belum_absen"] = max(0, total_siswa - sum(out.values()))
    out["total_siswa"] = total_siswa
    out["date"] = date
    return out

@api.get("/attendance/export")
async def export_attendance(date: Optional[str] = None, user=Depends(get_current_user)):
    q = dscope(user)
    if date: q["date"] = date
    docs = await db.attendance.find(q, {"_id": 0}).sort("scanned_at", -1).to_list(5000)
    columns = ["Tanggal", "Nama Siswa", "Kelas", "Status", "Metode", "Waktu Scan", "Petugas"]
    rows = [{"Tanggal": d.get("date"), "Nama Siswa": d.get("student_name"),
             "Kelas": d.get("kelas") or "-", "Status": (d.get("status") or "").upper(),
             "Metode": {"barcode": "Barcode USB", "manual": "Manual", "email": "Konfirmasi Email", "sistem": "Otomatis (Sistem)"}.get(d.get("method"), "QR Code"),
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

# ---------------- WEEKLY ATTENDANCE RECAP & AUTO-ARCHIVE ----------------
# Roles allowed to open "Storage Rekap Absensi": super_admin (auto), kepsek, guru, staff_tu
ATT_RECAP_ROLES = require_roles("kepsek", "guru", "staff_tu")
DAY_LABELS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"]
STATUS_ORDER = ["hadir", "izin", "sakit", "alpa"]
STATUS_XLSX = {"hadir": "H", "izin": "I", "sakit": "S", "alpa": "A"}
STATUS_FILL = {"H": "DCFCE7", "I": "E0F2FE", "S": "FEF3C7", "A": "FEE2E2"}
_BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]

def _monday_of(d):
    return d - timedelta(days=d.weekday())

def _week_dates(monday):
    return [(monday + timedelta(days=i)).isoformat() for i in range(7)]

def _fmt_range(a, b):
    da, db_ = _date.fromisoformat(a), _date.fromisoformat(b)
    if da.month == db_.month and da.year == db_.year:
        return f"{da.day}–{db_.day} {_BULAN[db_.month-1]} {db_.year}"
    return f"{da.day} {_BULAN[da.month-1]} – {db_.day} {_BULAN[db_.month-1]} {db_.year}"

def _build_week_matrix(docs, days):
    students, daily = {}, {dd: {"hadir": 0, "izin": 0, "sakit": 0, "alpa": 0, "total": 0} for dd in days}
    for d in docs:
        sid = d.get("student_id")
        if sid not in students:
            students[sid] = {"id": sid, "name": d.get("student_name") or "-", "kelas": d.get("kelas") or "-", "marks": {}}
        st = (d.get("status") or "").lower()
        dd = d.get("date")
        students[sid]["marks"][dd] = st
        if dd in daily and st in STATUS_ORDER:
            daily[dd][st] += 1
            daily[dd]["total"] += 1
    slist = sorted(students.values(), key=lambda s: ((s["kelas"] or ""), (s["name"] or "")))
    for s in slist:
        tot = {"hadir": 0, "izin": 0, "sakit": 0, "alpa": 0}
        for dd in days:
            if s["marks"].get(dd) in tot:
                tot[s["marks"][dd]] += 1
        s["totals"] = tot
    totals = {"hadir": 0, "izin": 0, "sakit": 0, "alpa": 0}
    for dd in days:
        for k in totals:
            totals[k] += daily[dd][k]
    return slist, daily, totals

def weekly_attendance_excel(label, subtitle, days, students, daily, totals):
    wb = Workbook(); ws = wb.active; ws.title = "Rekap Mingguan"
    CO = 2  # content starts at column B (A = left margin)
    day_hdrs = [f"{DAY_LABELS[i]}\n{days[i][8:10]}/{days[i][5:7]}" for i in range(7)]
    columns = ["No", "Nama Siswa", "Kelas"] + day_hdrs + ["H", "I", "S", "A"]
    n = len(columns)
    first = get_column_letter(CO); last = get_column_letter(CO + n - 1)
    ws.column_dimensions["A"].width = 2.6
    ws.column_dimensions[get_column_letter(CO + n)].width = 2.6
    ws.row_dimensions[1].height = 12
    DAY_C = CO + 3   # first day column
    TOT_C = CO + 10  # first H/I/S/A total column
    ws.merge_cells(f"{first}2:{last}2"); c = ws.cell(2, CO, f"SMA NEGERI 1 LAGUBOTI  -  {label}")
    c.font = Font(size=15, bold=True, color="FFFFFF"); c.fill = PatternFill("solid", fgColor=SKY_600)
    c.alignment = Alignment(horizontal="left", vertical="center", indent=1); ws.row_dimensions[2].height = 30
    ws.merge_cells(f"{first}3:{last}3"); c2 = ws.cell(3, CO, subtitle)
    c2.font = Font(size=10, italic=True, color="FFFFFF"); c2.fill = PatternFill("solid", fgColor=SLATE_900)
    c2.alignment = Alignment(horizontal="left", vertical="center", indent=1); ws.row_dimensions[3].height = 20
    ws.row_dimensions[4].height = 6
    hr = 5
    for i, col in enumerate(columns):
        cell = ws.cell(hr, CO + i, col); cell.font = Font(bold=True, color="FFFFFF", size=10)
        cell.fill = PatternFill("solid", fgColor=SKY_600); cell.border = _border("FFFFFF")
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    ws.row_dimensions[hr].height = 32
    for ri, s in enumerate(students):
        r = hr + 1 + ri; zebra = PatternFill("solid", fgColor=SLATE_50) if ri % 2 == 0 else None
        for ci, val in enumerate([ri + 1, s["name"], s["kelas"]]):
            cell = ws.cell(r, CO + ci, val); cell.border = _border(); cell.font = Font(size=10, color=SLATE_900)
            cell.alignment = Alignment(horizontal="left" if ci == 1 else "center", vertical="center", indent=1 if ci == 1 else 0)
            if zebra: cell.fill = zebra
        for di, dd in enumerate(days):
            cell = ws.cell(r, DAY_C + di); mark = STATUS_XLSX.get(s["marks"].get(dd), "")
            cell.value = mark; cell.border = _border(); cell.font = Font(size=10, bold=True, color=SLATE_900)
            cell.alignment = Alignment(horizontal="center", vertical="center")
            if mark: cell.fill = PatternFill("solid", fgColor=STATUS_FILL[mark])
            elif zebra: cell.fill = zebra
        for ti, k in enumerate(STATUS_ORDER):
            cell = ws.cell(r, TOT_C + ti, s["totals"][k]); cell.border = _border()
            cell.alignment = Alignment(horizontal="center", vertical="center"); cell.font = Font(size=10, color=SLATE_900)
            if zebra: cell.fill = zebra
        ws.row_dimensions[r].height = 20
    if not students:
        r = hr + 1; ws.merge_cells(start_row=r, start_column=CO, end_row=r, end_column=CO + n - 1)
        e = ws.cell(r, CO, "Tidak ada data absensi pada minggu ini."); e.font = Font(italic=True, color="94A3B8")
        e.alignment = Alignment(horizontal="center", vertical="center")
        for ci in range(n): ws.cell(r, CO + ci).border = _border()
        ws.row_dimensions[r].height = 24
    fr = hr + max(len(students), 1) + 1
    ws.merge_cells(start_row=fr, start_column=CO, end_row=fr, end_column=CO + 2)
    for ci in range(3):
        cell = ws.cell(fr, CO + ci); cell.fill = PatternFill("solid", fgColor=SLATE_900); cell.border = _border()
    t = ws.cell(fr, CO, "TOTAL HADIR HARIAN"); t.font = Font(bold=True, color="FFFFFF"); t.alignment = Alignment(horizontal="right", vertical="center", indent=1)
    for di, dd in enumerate(days):
        cell = ws.cell(fr, DAY_C + di, daily[dd]["hadir"]); cell.font = Font(bold=True, color=SKY_600)
        cell.alignment = Alignment(horizontal="center", vertical="center"); cell.fill = PatternFill("solid", fgColor=SKY_100); cell.border = _border()
    for ti, k in enumerate(STATUS_ORDER):
        cell = ws.cell(fr, TOT_C + ti, totals[k]); cell.font = Font(bold=True, color=SKY_600)
        cell.alignment = Alignment(horizontal="center", vertical="center"); cell.fill = PatternFill("solid", fgColor=SKY_100); cell.border = _border()
    ws.row_dimensions[fr].height = 22
    lr = fr + 2; ws.merge_cells(start_row=lr, start_column=CO, end_row=lr, end_column=CO + n - 1)
    ws.cell(lr, CO, "Keterangan:  H = Hadir    I = Izin    S = Sakit    A = Alpa").font = Font(size=9, italic=True, color="64748B")
    ws.row_dimensions[lr + 1].height = 10
    ws.column_dimensions[get_column_letter(CO)].width = 5
    ws.column_dimensions[get_column_letter(CO + 1)].width = 30
    ws.column_dimensions[get_column_letter(CO + 2)].width = 12
    for i in range(DAY_C, DAY_C + 7): ws.column_dimensions[get_column_letter(i)].width = 9
    for i in range(TOT_C, TOT_C + 4): ws.column_dimensions[get_column_letter(i)].width = 5.5
    ws.sheet_view.showGridLines = False; ws.freeze_panes = f"{get_column_letter(DAY_C)}{hr+1}"
    ws.page_margins = PageMargins(left=0.5, right=0.5, top=0.6, bottom=0.6)
    ws.print_options.horizontalCentered = True
    buf = io.BytesIO(); wb.save(buf); buf.seek(0); return buf.getvalue()

@api.get("/attendance/week")
async def attendance_week(start: Optional[str] = None, user=Depends(get_current_user)):
    try:
        mon = _monday_of(_date.fromisoformat(start)) if start else _monday_of(datetime.now(WIB).date())
    except Exception:
        raise HTTPException(400, "Tanggal tidak valid")
    days = _week_dates(mon)
    docs = await db.attendance.find({"date": {"$gte": days[0], "$lte": days[6]}, **dscope(user)}, {"_id": 0}).to_list(20000)
    students, daily, totals = _build_week_matrix(docs, days)
    return {"start": days[0], "end": days[6], "days": days, "day_labels": DAY_LABELS,
            "label": _fmt_range(days[0], days[6]), "students": students, "daily": daily,
            "totals": totals, "record_count": len(docs)}

@api.get("/attendance/week/export")
async def attendance_week_export(start: Optional[str] = None, user=Depends(get_current_user)):
    try:
        mon = _monday_of(_date.fromisoformat(start)) if start else _monday_of(datetime.now(WIB).date())
    except Exception:
        raise HTTPException(400, "Tanggal tidak valid")
    days = _week_dates(mon)
    docs = await db.attendance.find({"date": {"$gte": days[0], "$lte": days[6]}, **dscope(user)}, {"_id": 0}).to_list(20000)
    students, daily, totals = _build_week_matrix(docs, days)
    label = f"Rekap Absensi Mingguan {_fmt_range(days[0], days[6])}"
    data = weekly_attendance_excel(label, f"Diekspor oleh {user['name']} pada {now_iso()[:19].replace('T',' ')}", days, students, daily, totals)
    return xlsx_response(data, f"Rekap_Absensi_{days[0]}_sd_{days[6]}.xlsx")

async def _archive_week(is_demo, monday, generated_by):
    days = _week_dates(monday)
    scope = {"is_demo": True} if is_demo else {"is_demo": {"$ne": True}}
    docs = await db.attendance.find({"date": {"$gte": days[0], "$lte": days[6]}, **scope}, {"_id": 0}).to_list(30000)
    if not docs:
        return None
    students, daily, totals = _build_week_matrix(docs, days)
    label = f"Rekap Absensi Mingguan {_fmt_range(days[0], days[6])}"
    data = weekly_attendance_excel(label, f"Arsip otomatis · dibuat oleh {generated_by}", days, students, daily, totals)
    arc = {"id": str(uuid.uuid4()), "is_demo": bool(is_demo), "period_start": days[0], "period_end": days[6],
           "label": label, "record_count": len(docs), "student_count": len(students),
           "summary": totals, "generated_at": now_iso(), "generated_by": generated_by,
           "file_b64": base64.b64encode(data).decode()}
    await db.attendance_archives.insert_one(arc)
    await db.attendance.delete_many({"date": {"$gte": days[0], "$lte": days[6]}, **scope})
    return arc

async def _archive_completed_weeks(is_demo, generated_by):
    """Archive every completed week (date <= last Sunday) into Storage and purge those records. Current week is kept live."""
    today = datetime.now(WIB).date()
    last_sunday = (_monday_of(today) - timedelta(days=1)).isoformat()
    scope = {"is_demo": True} if is_demo else {"is_demo": {"$ne": True}}
    dates = await db.attendance.distinct("date", {"date": {"$lte": last_sunday}, **scope})
    mondays = sorted({_monday_of(_date.fromisoformat(d)) for d in dates})
    created = []
    for mon in mondays:
        arc = await _archive_week(is_demo, mon, generated_by)
        if arc:
            created.append({"label": arc["label"], "records": arc["record_count"]})
    return created

async def run_attendance_weekly_archive():
    for is_demo in (False, True):
        try:
            await _archive_completed_weeks(is_demo, "Otomatis (Jadwal Mingguan)")
        except Exception as e:
            logging.exception("Weekly attendance archive failed: %s", e)

@api.get("/attendance/archives")
async def list_att_archives(user=Depends(ATT_RECAP_ROLES)):
    return await db.attendance_archives.find(dscope(user), {"_id": 0, "file_b64": 0}).sort("period_start", -1).to_list(500)

@api.get("/attendance/archives/{aid}/download")
async def download_att_archive(aid: str, user=Depends(ATT_RECAP_ROLES)):
    arc = await db.attendance_archives.find_one({"id": aid, **dscope(user)})
    if not arc:
        raise HTTPException(404, "Arsip tidak ditemukan")
    return xlsx_response(base64.b64decode(arc["file_b64"]), f"Rekap_Absensi_{arc['period_start']}_sd_{arc['period_end']}.xlsx")

@api.delete("/attendance/archives/{aid}")
async def delete_att_archive(aid: str, user=Depends(require_roles("kepsek", "staff_tu"))):
    res = await db.attendance_archives.delete_one({"id": aid, **dscope(user)})
    if not res.deleted_count:
        raise HTTPException(404, "Arsip tidak ditemukan")
    return {"ok": True}

@api.post("/attendance/archive-now")
async def attendance_archive_now(user=Depends(ATT_RECAP_ROLES)):
    created = await _archive_completed_weeks(bool(user.get("is_demo")), user["name"])
    return {"ok": True, "archived": created, "count": len(created)}

@api.post("/cron/attendance-archive")
async def cron_attendance_archive(request: Request, bg: BackgroundTasks):
    # Cron endpoints must ack 2xx immediately; enqueue/background the actual work.
    secret = os.environ.get("WEBHOOK_CRON_SECRET", "")
    auth = request.headers.get("Authorization", "")
    if not secret or not auth.startswith("Bearer ") or not hmac.compare_digest(auth[7:], secret):
        raise HTTPException(401, "Unauthorized")
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(400, "Invalid body")
    run_id = request.headers.get("X-Webhook-Id") or (body or {}).get("run_id")
    if not run_id:
        raise HTTPException(400, "Missing run id")
    if await db.cron_runs.find_one({"run_id": run_id}):
        return {"ok": True, "duplicate": True}
    await db.cron_runs.insert_one({"run_id": run_id, "job": "attendance-archive", "created_at": now_iso()})
    bg.add_task(run_attendance_weekly_archive)
    return {"ok": True}


# ---------------- ATTENDANCE REMINDER & AUTO-ALPA (08:00 / 09:00 WIB) ----------------
WIB = timezone(timedelta(hours=7))

def _today_wib():
    return datetime.now(WIB).date().isoformat()

async def _students_tanpa_absen(today: str):
    done = await db.attendance.distinct("student_id", {"date": today, "is_demo": {"$ne": True}})
    return await db.users.find({"role": "siswa", "is_demo": {"$ne": True}, "id": {"$nin": done}},
                               {"password_hash": 0, "_id": 0}).to_list(5000)

async def run_attendance_reminder():
    """08:00 WIB — tanya siswa yang belum absen: Sakit / Izin? (email tombol + notifikasi aplikasi)."""
    today = _today_wib()
    base = os.environ.get("FRONTEND_URL", "").rstrip("/")
    brand = escape(os.environ.get("EMAIL_FROM_NAME", "SMA NEGERI 1 LAGUBOTI"))
    total, sent = 0, 0
    for s in await _students_tanpa_absen(today):
        if await db.attendance_confirm_tokens.find_one({"student_id": s["id"], "date": today}):
            continue
        total += 1
        token = secrets.token_urlsafe(24)
        await db.attendance_confirm_tokens.insert_one({
            "id": str(uuid.uuid4()), "token": token, "student_id": s["id"], "date": today,
            "used": False, "created_at": now_iso()})
        sakit_url = f"{base}/api/attendance/confirm?token={token}&status=sakit"
        izin_url = f"{base}/api/attendance/confirm?token={token}&status=izin"
        html = (f'<div style="font-family:Arial;padding:24px;max-width:560px;margin:auto">'
                f'<h2 style="color:#0284C7">Kamu Belum Absen Hari Ini</h2>'
                f'<p>Halo <b>{escape(s["name"])}</b>, sampai pukul 08.00 WIB kehadiranmu di <b>{brand}</b> belum tercatat.</p>'
                f'<p>Jika kamu tidak dapat hadir, cukup tekan salah satu tombol ini:</p>'
                f'<p><a href="{sakit_url}" style="display:inline-block;padding:12px 28px;background:#D97706;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold">Saya Sakit</a>'
                f'&nbsp;&nbsp;<a href="{izin_url}" style="display:inline-block;padding:12px 28px;background:#0284C7;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold">Saya Izin</a></p>'
                f'<p style="color:#64748B;font-size:12px">Jika kamu sebenarnya hadir di sekolah, abaikan email ini dan segera scan kartu pelajarmu. '
                f'Tanpa scan atau konfirmasi sampai pukul 09.00 WIB, kehadiranmu otomatis tercatat <b>Alpa</b>.</p>'
                f'<p style="color:#94A3B8;font-size:11px;margin-top:24px">— {brand}. Tautan konfirmasi hanya berlaku hari ini dan sekali pakai.</p></div>')
        if await send_email(s["email"], f"Konfirmasi Kehadiran - {s['name']}", html):
            sent += 1
        await notify(s["id"], "Kamu belum absen hari ini",
                     "Sampai pukul 08.00 WIB kehadiranmu belum tercatat. Konfirmasi Sakit/Izin lewat tombol di email atau buka tautan ini. Lewat 09.00 WIB tanpa kabar = Alpa.",
                     f"/konfirmasi-absensi?token={token}")
    logger.info("Attendance reminder %s: %d siswa belum absen, %d email terkirim", today, total, sent)
    return sent

async def run_attendance_auto_alpha():
    """09:00 WIB — siswa yang tetap tanpa kehadiran otomatis tercatat Alpa."""
    today = _today_wib()
    students = await _students_tanpa_absen(today)
    for s in students:
        await db.attendance.insert_one({
            "id": str(uuid.uuid4()), "student_id": s["id"], "student_name": s["name"],
            "kelas": s.get("kelas"), "date": today, "status": "alpa", "scanned_at": now_iso(),
            "scanned_by": "Sistem (Auto-Alpa lewat 09.00 WIB)", "photo": None, "method": "sistem",
            "is_demo": False})
    if students:
        await notify([s["id"] for s in students], "Kamu tercatat Alpa hari ini",
                     "Tidak ada scan atau konfirmasi Sakit/Izin sampai pukul 09.00 WIB, sehingga kehadiranmu hari ini otomatis tercatat Alpa. Hubungi wali kelas jika ini keliru.")
    logger.info("Auto-alpa %s: %d siswa ditandai alpa", today, len(students))
    return len(students)

@api.get("/attendance/confirm")
async def attendance_confirm(token: str = "", status: str = ""):
    base = os.environ.get("FRONTEND_URL", "").rstrip("/")
    def red(**params):
        return RedirectResponse(f"{base}/konfirmasi-absensi?{urlencode(params)}", status_code=303)
    if status not in ("sakit", "izin"):
        return red(result="invalid")
    rec = await db.attendance_confirm_tokens.find_one({"token": token})
    if not rec:
        return red(result="invalid")
    student = await db.users.find_one({"id": rec["student_id"]}, {"password_hash": 0, "_id": 0})
    nama = (student or {}).get("name", "")
    if rec.get("used"):
        return red(result="used", nama=nama)
    today = _today_wib()
    if rec.get("date") != today:
        return red(result="expired", nama=nama)
    existing = await db.attendance.find_one({"student_id": rec["student_id"], "date": today})
    if existing:
        await db.attendance_confirm_tokens.update_one({"id": rec["id"]}, {"$set": {"used": True, "used_at": now_iso(), "status": status}})
        return red(result="already", status=existing.get("status", ""), nama=nama)
    await db.attendance.insert_one({
        "id": str(uuid.uuid4()), "student_id": student["id"], "student_name": student["name"],
        "kelas": student.get("kelas"), "date": today, "status": status, "scanned_at": now_iso(),
        "scanned_by": "Konfirmasi Siswa (Email)", "photo": None, "method": "email", "is_demo": False})
    await db.attendance_confirm_tokens.update_one({"id": rec["id"]}, {"$set": {"used": True, "used_at": now_iso(), "status": status}})
    await notify(rec["student_id"], "Konfirmasi kehadiran diterima",
                 f"Kehadiranmu hari ini tercatat sebagai {status.capitalize()}. Terima kasih sudah memberi kabar.")
    return red(result="ok", status=status, nama=nama)

async def _cron_guard(request: Request, job: str) -> str:
    """Verifikasi bearer secret + idempotensi run_id untuk endpoint cron. Return '' jika duplikat."""
    secret = os.environ.get("WEBHOOK_CRON_SECRET", "")
    auth = request.headers.get("Authorization", "")
    if not secret or not auth.startswith("Bearer ") or not hmac.compare_digest(auth[7:], secret):
        raise HTTPException(401, "Unauthorized")
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(400, "Invalid body")
    run_id = request.headers.get("X-Webhook-Id") or (body or {}).get("run_id")
    if not run_id:
        raise HTTPException(400, "Missing run id")
    if await db.cron_runs.find_one({"run_id": run_id}):
        return ""
    await db.cron_runs.insert_one({"run_id": run_id, "job": job, "created_at": now_iso()})
    return run_id

@api.post("/cron/attendance-reminder")
async def cron_attendance_reminder(request: Request, bg: BackgroundTasks):
    # Cron endpoints must ack 2xx immediately; enqueue/background the actual work.
    run_id = await _cron_guard(request, "attendance-reminder")
    if not run_id:
        return {"ok": True, "duplicate": True}
    bg.add_task(run_attendance_reminder)
    return {"ok": True}

@api.post("/cron/attendance-auto-alpha")
async def cron_attendance_auto_alpha(request: Request, bg: BackgroundTasks):
    # Cron endpoints must ack 2xx immediately; enqueue/background the actual work.
    run_id = await _cron_guard(request, "attendance-auto-alpha")
    if not run_id:
        return {"ok": True, "duplicate": True}
    bg.add_task(run_attendance_auto_alpha)
    return {"ok": True}


# ---------------- INVENTORY ----------------
class InventoryItem(BaseModel):
    name: str
    category: str
    stock: int
    condition: str = "Baik"
    location: Optional[str] = None       # lokasi penyimpanan
    code: Optional[str] = None           # kode/no. inventaris
    min_stock: Optional[int] = 0         # ambang batas stok menipis
    description: Optional[str] = None
    image: Optional[str] = None          # foto barang (URL dari /api/upload)

class InventoryUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    stock: Optional[int] = None
    condition: Optional[str] = None
    location: Optional[str] = None
    code: Optional[str] = None
    min_stock: Optional[int] = None
    description: Optional[str] = None
    image: Optional[str] = None

class BorrowRequest(BaseModel):
    item_id: str
    quantity: int = 1
    purpose: str
    return_date: str

@api.get("/inventory")
async def list_inventory(user=Depends(get_current_user)):
    items = await db.inventory.find(dscope(user), {"_id": 0}).to_list(500)
    # outstanding = quantity currently out on approved-but-not-returned loans
    pipeline = [{"$match": {"status": "Disetujui", **dscope(user)}},
                {"$group": {"_id": "$item_id", "n": {"$sum": "$quantity"}}}]
    agg = await db.borrow_requests.aggregate(pipeline).to_list(1000)
    out_map = {a["_id"]: a["n"] for a in agg}
    for it in items:
        it["outstanding"] = int(out_map.get(it["id"], 0))
        it["total"] = int(it.get("stock", 0)) + it["outstanding"]
        it["low_stock"] = int(it.get("stock", 0)) <= int(it.get("min_stock", 0) or 0)
    # sort: low stock first, then by name
    items.sort(key=lambda x: (not x["low_stock"], (x.get("name") or "").lower()))
    return items

@api.get("/inventory/{iid}/history")
async def inventory_history(iid: str, user=Depends(require_roles("staff_tu", "super_admin"))):
    return await db.borrow_requests.find({"item_id": iid, **dscope(user)}, {"_id": 0}).sort("created_at", -1).to_list(500)

@api.post("/inventory")
async def add_inventory(body: InventoryItem, user=Depends(require_roles("staff_tu", "super_admin"))):
    doc = {"id": str(uuid.uuid4()), **body.model_dump(), "created_at": now_iso()}
    dstamp(doc, user)
    await db.inventory.insert_one(doc); doc.pop("_id", None)
    return doc

@api.patch("/inventory/{iid}")
async def edit_inventory(iid: str, body: InventoryUpdate, user=Depends(require_roles("staff_tu", "super_admin"))):
    item = await db.inventory.find_one({"id": iid, **dscope(user)})
    if not item:
        raise HTTPException(404, "Item tidak ditemukan")
    upd = {k: v for k, v in body.model_dump().items() if v is not None}
    if not upd:
        raise HTTPException(400, "Tidak ada perubahan")
    await db.inventory.update_one({"id": iid}, {"$set": {**upd, "updated_at": now_iso()}})
    doc = await db.inventory.find_one({"id": iid}, {"_id": 0})
    return doc

@api.delete("/inventory/{iid}")
async def del_inventory(iid: str, user=Depends(require_roles("staff_tu", "super_admin"))):
    await db.inventory.delete_one({"id": iid}); return {"ok": True}



@api.post("/borrow")
async def create_borrow(body: BorrowRequest, user=Depends(get_current_user)):
    item = await db.inventory.find_one({"id": body.item_id, **dscope(user)})
    if not item: raise HTTPException(404, "Item tidak ditemukan")
    if body.quantity < 1: raise HTTPException(400, "Jumlah minimal 1")
    if body.quantity > int(item.get("stock", 0)):
        raise HTTPException(400, f"Stok tidak cukup. Tersedia: {item.get('stock', 0)}")
    doc = {"id": str(uuid.uuid4()), "item_id": body.item_id, "item_name": item["name"],
           "quantity": body.quantity, "purpose": body.purpose, "return_date": body.return_date,
           "requester_id": user["id"], "requester_name": user["name"],
           "requester_role": user.get("role"), "requester_kelas": user.get("kelas"),
           "requester_nisn": user.get("nisn"), "requester_email": user.get("email"),
           "status": "Menunggu Approval", "created_at": now_iso(), "is_demo": bool(user.get("is_demo"))}
    await db.borrow_requests.insert_one(doc); doc.pop("_id", None)
    return doc

@api.get("/borrow")
async def list_borrow(mine: bool = False, user=Depends(get_current_user)):
    q = {"requester_id": user["id"]} if mine else dscope(user)
    return await db.borrow_requests.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)

@api.patch("/borrow/{bid}")
async def update_borrow(bid: str, status: str, user=Depends(require_roles("staff_tu", "super_admin"))):
    if status not in ["Disetujui", "Ditolak", "Dikembalikan"]:
        raise HTTPException(400, "Status tidak valid")
    br = await db.borrow_requests.find_one({"id": bid})
    if not br: raise HTTPException(404, "Permintaan tidak ditemukan")
    prev = br.get("status")
    qty = int(br.get("quantity", 0))
    item = await db.inventory.find_one({"id": br.get("item_id")})
    # Approving an outstanding request reduces available stock (only once)
    if status == "Disetujui" and prev != "Disetujui":
        if item and qty > int(item.get("stock", 0)):
            raise HTTPException(400, f"Stok tidak cukup untuk disetujui. Tersedia: {item.get('stock', 0)}")
        if item:
            await db.inventory.update_one({"id": item["id"]}, {"$inc": {"stock": -qty}})
    # Returning or rejecting a previously-approved loan restores stock
    if status in ("Dikembalikan", "Ditolak") and prev == "Disetujui" and item:
        await db.inventory.update_one({"id": item["id"]}, {"$inc": {"stock": qty}})
    await db.borrow_requests.update_one({"id": bid}, {"$set": {"status": status, "updated_at": now_iso(),
                                                                 "approved_by": user["name"]}})
    if br.get("requester_id"):
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

class AssignmentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    subject: Optional[str] = None
    due_date: Optional[str] = None
    attachments: Optional[List[dict]] = None

@api.get("/assignments")
async def list_assign(class_id: Optional[str] = None, subject: Optional[str] = None, user=Depends(get_current_user)):
    q = dscope(user)
    if user["role"] == "siswa":
        q["kelas"] = user.get("kelas")
    if class_id: q["class_id"] = class_id
    if subject: q["subject"] = subject
    lock = await locked_class_query(user)
    if lock: q["$and"] = lock
    return await db.assignments.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)

@api.post("/assignments")
async def create_assign(body: AssignmentIn, user=Depends(require_roles("guru", "super_admin"))):
    await guru_assert_manages(user, body.class_id, body.kelas, body.subject)
    doc = {"id": str(uuid.uuid4()), **body.model_dump(), "teacher_id": user["id"],
           "teacher_name": user["name"], "created_at": now_iso()}
    dstamp(doc, user)
    await db.assignments.insert_one(doc); doc.pop("_id", None)
    return doc

@api.patch("/assignments/{aid}")
async def edit_assign(aid: str, body: AssignmentUpdate, user=Depends(require_roles("guru", "super_admin"))):
    a = await db.assignments.find_one({"id": aid})
    if not a:
        raise HTTPException(404, "Tugas tidak ditemukan")
    if user["role"] != "super_admin" and a.get("teacher_id") != user["id"]:
        raise HTTPException(403, "Hanya pembuat atau Super Admin yang dapat mengedit tugas ini")
    upd = {k: v for k, v in body.model_dump().items() if v is not None}
    if upd:
        await db.assignments.update_one({"id": aid}, {"$set": upd})
    return await db.assignments.find_one({"id": aid}, {"_id": 0})

@api.delete("/assignments/{aid}")
async def delete_assign(aid: str, user=Depends(require_roles("guru", "super_admin"))):
    a = await db.assignments.find_one({"id": aid})
    if not a:
        raise HTTPException(404, "Tugas tidak ditemukan")
    if user["role"] != "super_admin" and a.get("teacher_id") != user["id"]:
        raise HTTPException(403, "Hanya pembuat atau Super Admin yang dapat menghapus tugas ini")
    await db.assignments.delete_one({"id": aid})
    await db.submissions.delete_many({"assignment_id": aid})
    return {"ok": True}

@api.post("/submissions")
async def submit(body: SubmissionIn, user=Depends(require_roles("siswa"))):
    a = await db.assignments.find_one({"id": body.assignment_id})
    if not a:
        raise HTTPException(404, "Tugas tidak ditemukan")
    await assert_doc_class_unlocked(user, a)
    existing = await db.submissions.find_one({"assignment_id": body.assignment_id, "student_id": user["id"]})
    payload = {"content": body.content or "", "attachments": body.attachments or [], "submitted_at": now_iso()}
    if existing:
        await db.submissions.update_one({"id": existing["id"]}, {"$set": payload})
        return {"ok": True}
    doc = {"id": str(uuid.uuid4()), "assignment_id": body.assignment_id, "student_id": user["id"],
           "student_name": user["name"], "grade": None, **payload}
    dstamp(doc, user)
    await db.submissions.insert_one(doc)
    return {"ok": True}

@api.get("/submissions")
async def list_subs(assignment_id: Optional[str] = None, user=Depends(get_current_user)):
    q = dscope(user)
    if assignment_id: q["assignment_id"] = assignment_id
    # student-type roles may only ever read their own full submission (content/files)
    if user["role"] in ("siswa", "ketua_kelas", "ketua_osis", "orang_tua"):
        q["student_id"] = user["id"]
    return await db.submissions.find(q, {"_id": 0}).to_list(1000)

@api.get("/submissions/status")
async def submissions_status(assignment_id: str, user=Depends(get_current_user)):
    """Submission 'warehouse' roster: everyone in the class can see WHO submitted and
    when, but students never receive other students' content/attachments."""
    a = await db.assignments.find_one({"id": assignment_id}, {"_id": 0})
    if not a:
        raise HTTPException(404, "Tugas tidak ditemukan")
    await assert_doc_class_unlocked(user, a)
    role = user["role"]
    # access control
    if role in ("siswa", "ketua_kelas", "ketua_osis"):
        if user.get("kelas") != a.get("kelas"):
            raise HTTPException(403, "Anda bukan anggota kelas ini")
    elif role == "guru":
        klass = None
        if a.get("class_id"):
            klass = await db.classes.find_one({"id": a["class_id"]})
        if not klass and a.get("kelas"):
            klass = await db.classes.find_one({"name": a["kelas"], **dscope(user)})
        if not guru_can_access_class(user, klass):
            raise HTTPException(403, "Anda tidak mengampu kelas ini")
    # privileged roles (super_admin/kepsek/staff_tu) pass through
    privileged = role in ("guru", "super_admin", "kepsek", "staff_tu")
    students = await db.users.find(
        {"role": {"$in": ["siswa", "ketua_kelas", "ketua_osis"]}, "kelas": a.get("kelas"), **dscope(user)},
        {"_id": 0, "id": 1, "name": 1},
    ).sort("name", 1).to_list(1000)
    subs = await db.submissions.find({"assignment_id": assignment_id}, {"_id": 0}).to_list(1000)
    submap = {s["student_id"]: s for s in subs}
    roster = []
    for st in students:
        s = submap.get(st["id"])
        row = {
            "student_id": st["id"], "student_name": st["name"],
            "submitted": bool(s),
            "submitted_at": s.get("submitted_at") if s else None,
            "graded": bool(s and s.get("grade") is not None),
            "is_me": st["id"] == user["id"],
        }
        if privileged and s and s.get("grade") is not None:
            row["grade"] = s.get("grade")
        roster.append(row)
    submitted_count = sum(1 for r in roster if r["submitted"])
    return {
        "assignment": {"id": a["id"], "title": a.get("title"), "kelas": a.get("kelas"), "subject": a.get("subject")},
        "total": len(roster), "submitted_count": submitted_count,
        "privileged": privileged, "roster": roster,
    }

@api.patch("/submissions/{sid}/grade")
async def grade_sub(sid: str, grade: float, user=Depends(require_roles("guru", "super_admin"))):
    await db.submissions.update_one({"id": sid}, {"$set": {"grade": grade}})
    sub = await db.submissions.find_one({"id": sid})
    if sub and sub.get("student_id"):
        assign = await db.assignments.find_one({"id": sub["assignment_id"]})
        await notify([sub["student_id"]], "Tugas dinilai",
                     f"Tugas '{assign['title'] if assign else ''}' mendapat nilai {grade}", "/assignments")
    return {"ok": True}

# ---------------- SUBJECTS (Master Mapel) ----------------
class SubjectIn(BaseModel):
    name: str

@api.get("/subjects")
async def list_subjects(user=Depends(get_current_user)):
    return await db.subjects.find(dscope(user), {"_id": 0}).sort("name", 1).to_list(500)

@api.post("/subjects")
async def create_subject(body: SubjectIn, user=Depends(require_roles("super_admin"))):
    name = body.name.strip()
    if not name:
        raise HTTPException(400, "Nama mapel wajib diisi")
    if await db.subjects.find_one({"name": name, **dscope(user)}):
        raise HTTPException(400, "Mapel sudah ada")
    doc = {"id": str(uuid.uuid4()), "name": name, "created_at": now_iso()}
    dstamp(doc, user)
    await db.subjects.insert_one(doc)
    return strip(doc)

@api.delete("/subjects/{sid}")
async def delete_subject(sid: str, user=Depends(require_roles("super_admin"))):
    await db.subjects.delete_one({"id": sid})
    return {"ok": True}

# ---------------- RESCHEDULE / KETIDAKHADIRAN GURU ----------------
class RescheduleIn(BaseModel):
    class_id: str
    subject: Optional[str] = None
    reason_type: str  # sakit | rapat | berhalangan | lainnya
    reason: str
    date: Optional[str] = None       # tanggal berhalangan
    new_date: Optional[str] = None   # jadwal pengganti (opsional)
    new_time: Optional[str] = None

@api.get("/reschedules")
async def list_reschedules(class_id: Optional[str] = None, user=Depends(get_current_user)):
    q = dscope(user)
    q["status"] = "active"
    if class_id:
        q["class_id"] = class_id
    elif user["role"] in ("siswa", "ketua_kelas", "ketua_osis"):
        # students without explicit class_id: show notices for their own class
        klass = await db.classes.find_one({"name": user.get("kelas"), **dscope(user)}, {"_id": 0, "id": 1})
        q["class_id"] = klass["id"] if klass else "__none__"
    return await db.reschedules.find(q, {"_id": 0}).sort("created_at", -1).to_list(200)

@api.post("/reschedules")
async def create_reschedule(body: RescheduleIn, user=Depends(require_roles("guru", "super_admin"))):
    klass = await db.classes.find_one({"id": body.class_id})
    if not klass:
        raise HTTPException(404, "Kelas tidak ditemukan")
    if user["role"] == "guru" and not guru_can_access_class(user, klass):
        raise HTTPException(403, "Anda tidak mengampu kelas ini")
    if not body.reason.strip():
        raise HTTPException(400, "Alasan wajib diisi")
    doc = {
        "id": str(uuid.uuid4()), "class_id": body.class_id, "class_name": klass.get("name"),
        "subject": body.subject, "reason_type": body.reason_type, "reason": body.reason.strip(),
        "date": body.date, "new_date": body.new_date, "new_time": body.new_time,
        "teacher_id": user["id"], "teacher_name": user["name"], "status": "active",
        "created_at": now_iso(),
    }
    dstamp(doc, user)
    await db.reschedules.insert_one(doc)
    # notify all students in the class
    students = await db.users.find(
        {"role": {"$in": ["siswa", "ketua_kelas", "ketua_osis"]}, "kelas": klass.get("name"), **dscope(user)},
        {"_id": 0, "id": 1},
    ).to_list(1000)
    sid_list = [s["id"] for s in students]
    subj = f" ({body.subject})" if body.subject else ""
    extra = f" Pengganti: {body.new_date or ''} {body.new_time or ''}".rstrip() if (body.new_date or body.new_time) else ""
    await notify(sid_list, f"Kelas {klass.get('name')}: guru berhalangan",
                 f"{user['name']}{subj} — {body.reason_type}: {body.reason.strip()}.{extra}",
                 f"/classes/{body.class_id}")
    return strip(doc)

@api.delete("/reschedules/{rid}")
async def delete_reschedule(rid: str, user=Depends(require_roles("guru", "super_admin"))):
    r = await db.reschedules.find_one({"id": rid})
    if not r:
        raise HTTPException(404, "Data tidak ditemukan")
    if user["role"] != "super_admin" and r.get("teacher_id") != user["id"]:
        raise HTTPException(403, "Hanya pembuat atau Super Admin yang dapat menghapus")
    await db.reschedules.update_one({"id": rid}, {"$set": {"status": "cancelled"}})
    return {"ok": True}

# ---------------- QUIZZES ----------------
class QuizQuestion(BaseModel):
    """A single multiple-choice question. `answer` is ALWAYS stored as the
    integer index of the correct option so scoring can never silently fail."""
    q: str
    options: List[str]
    answer: int = 0

    @model_validator(mode="before")
    @classmethod
    def _normalize(cls, data):
        if isinstance(data, dict):
            opts = [str(o).strip() for o in (data.get("options") or [])]
            data["options"] = opts
            ans = data.get("answer", 0)
            # Accept the correct answer sent either as an index or as the option
            # text, but always normalize it down to an integer index.
            if isinstance(ans, str):
                s = ans.strip()
                if s in opts:
                    ans = opts.index(s)
                elif s.lstrip("-").isdigit():
                    ans = int(s)
                else:
                    ans = 0
            try:
                ans = int(ans)
            except (TypeError, ValueError):
                ans = 0
            data["answer"] = ans
        return data

    @field_validator("q")
    @classmethod
    def _q_filled(cls, v):
        if not str(v).strip():
            raise ValueError("Pertanyaan soal tidak boleh kosong")
        return str(v).strip()

    @field_validator("options")
    @classmethod
    def _min_opts(cls, v):
        if len([o for o in v if str(o).strip()]) < 2:
            raise ValueError("Setiap soal harus memiliki minimal 2 opsi jawaban terisi")
        return v

    @model_validator(mode="after")
    def _answer_in_range(self):
        if self.answer < 0 or self.answer >= len(self.options):
            raise ValueError(f"Kunci jawaban (index {self.answer}) di luar jangkauan opsi soal")
        return self

class QuizIn(BaseModel):
    title: str
    kelas: str
    questions: List[QuizQuestion]  # answer kept as integer option index
    subject: Optional[str] = None
    class_id: Optional[str] = None
    password: Optional[str] = None
    time_limit: Optional[int] = None  # minutes; None/0 = no limit

class QuizUnlockIn(BaseModel):
    password: str

QUIZ_STAFF = ("super_admin", "guru")

def quiz_out(qz: dict, user: dict) -> dict:
    qz["has_password"] = bool(qz.pop("password_hash", None))
    qz["question_count"] = len(qz.get("questions") or [])
    qz["locked"] = qz["has_password"] and user.get("role") not in QUIZ_STAFF \
        and qz["id"] not in (user.get("unlocked_quizzes") or [])
    if user.get("role") not in QUIZ_STAFF:
        for question in qz.get("questions", []):
            question.pop("answer", None)
    if qz["locked"]:
        qz["questions"] = []
    return qz

class QuizAttemptIn(BaseModel):
    quiz_id: str
    answers: List[int]

class QuizUpdate(BaseModel):
    title: Optional[str] = None
    subject: Optional[str] = None
    questions: Optional[List[QuizQuestion]] = None
    password: Optional[str] = None
    remove_password: Optional[bool] = None
    time_limit: Optional[int] = None

QUIZ_GRACE_SECONDS = 20

def validate_time_limit(v):
    if v is not None and not (0 <= v <= 600):
        raise HTTPException(400, "Batas waktu harus 0-600 menit")

async def assert_quiz_open_for_student(user: dict, quiz: dict):
    await assert_doc_class_unlocked(user, quiz)
    if quiz.get("password_hash") and quiz["id"] not in (user.get("unlocked_quizzes") or []):
        raise HTTPException(423, "Quiz terkunci. Masukkan password quiz terlebih dahulu")

def shuffled_questions(quiz: dict, sess: dict) -> list:
    qs = quiz.get("questions") or []
    out = []
    for q_idx in sess["q_order"]:
        q = qs[q_idx]
        opts = q.get("options") or []
        out.append({"q": q.get("q"), "options": [opts[o] for o in sess["opt_orders"][len(out)] if o < len(opts)]})
    return out

@api.post("/quizzes/{qid}/start")
async def start_quiz(qid: str, user=Depends(require_roles("siswa"))):
    quiz = await db.quizzes.find_one({"id": qid, **dscope(user)})
    if not quiz:
        raise HTTPException(404, "Quiz tidak ditemukan")
    await assert_quiz_open_for_student(user, quiz)
    limit = quiz.get("time_limit") or 0
    now = datetime.now(timezone.utc)
    qs = quiz.get("questions") or []
    sess = await db.quiz_sessions.find_one({"quiz_id": qid, "student_id": user["id"]}, {"_id": 0})
    if not sess or len(sess.get("q_order", [])) != len(qs):
        await db.quiz_sessions.delete_one({"quiz_id": qid, "student_id": user["id"]})
        q_order = list(range(len(qs))); random.shuffle(q_order)
        opt_orders = []
        for q in qs:
            o = list(range(len(q.get("options") or []))); random.shuffle(o); opt_orders.append(o)
        sess = {"quiz_id": qid, "student_id": user["id"], "started_at": now.isoformat(),
                "deadline": (now + timedelta(minutes=limit)).isoformat() if limit else None,
                "q_order": q_order, "opt_orders": opt_orders}
        await db.quiz_sessions.insert_one(dict(sess))
    expired = bool(limit and now.isoformat() > sess["deadline"])
    return {"time_limit": limit, "started_at": sess["started_at"], "deadline": sess.get("deadline"),
            "server_now": now.isoformat(), "expired": expired,
            "questions": [] if expired else shuffled_questions(quiz, sess)}

@api.get("/quizzes")
async def list_quiz(class_id: Optional[str] = None, subject: Optional[str] = None, user=Depends(get_current_user)):
    q = dict(dscope(user))
    if user["role"] == "siswa": q["kelas"] = user.get("kelas")
    if class_id: q["class_id"] = class_id
    if subject: q["subject"] = subject
    lock = await locked_class_query(user)
    if lock: q["$and"] = lock
    quizzes = await db.quizzes.find(q, {"_id": 0}).to_list(500)
    return [quiz_out(qz, user) for qz in quizzes]

@api.post("/quizzes/{qid}/unlock")
async def unlock_quiz(qid: str, body: QuizUnlockIn, user=Depends(get_current_user)):
    qz = await db.quizzes.find_one({"id": qid, **dscope(user)}, {"_id": 0})
    if not qz:
        raise HTTPException(404, "Quiz tidak ditemukan")
    await assert_doc_class_unlocked(user, qz)
    if qz.get("password_hash") and not verify_pw(body.password, qz["password_hash"]):
        raise HTTPException(400, "Password quiz salah")
    await db.users.update_one({"id": user["id"]}, {"$addToSet": {"unlocked_quizzes": qid}})
    user["unlocked_quizzes"] = (user.get("unlocked_quizzes") or []) + [qid]
    return quiz_out(qz, user)

@api.post("/quizzes")
async def create_quiz(body: QuizIn, user=Depends(require_roles("guru", "super_admin"))):
    await guru_assert_manages(user, body.class_id, body.kelas, body.subject)
    validate_time_limit(body.time_limit)
    data = body.model_dump()
    pw = (data.pop("password") or "").strip()
    doc = {"id": str(uuid.uuid4()), **data, "teacher_id": user["id"],
           "teacher_name": user["name"], "created_at": now_iso()}
    if pw:
        doc["password_hash"] = hash_pw(pw)
    dstamp(doc, user)
    await db.quizzes.insert_one(doc); doc.pop("_id", None)
    return quiz_out(doc, user)

@api.patch("/quizzes/{qid}")
async def edit_quiz(qid: str, body: QuizUpdate, user=Depends(require_roles("guru", "super_admin"))):
    qz = await db.quizzes.find_one({"id": qid})
    if not qz:
        raise HTTPException(404, "Quiz tidak ditemukan")
    if user["role"] != "super_admin" and qz.get("teacher_id") != user["id"]:
        raise HTTPException(403, "Hanya pembuat atau Super Admin yang dapat mengedit quiz ini")
    validate_time_limit(body.time_limit)
    upd = {k: v for k, v in body.model_dump(exclude={"password", "remove_password"}).items() if v is not None}
    if "time_limit" in upd or "questions" in upd:
        await db.quiz_sessions.delete_many({"quiz_id": qid})
    pw = (body.password or "").strip()
    if body.remove_password:
        await db.quizzes.update_one({"id": qid}, {"$unset": {"password_hash": ""}})
    elif pw:
        upd["password_hash"] = hash_pw(pw)
        await db.users.update_many({"unlocked_quizzes": qid}, {"$pull": {"unlocked_quizzes": qid}})
    if upd:
        await db.quizzes.update_one({"id": qid}, {"$set": upd})
    return quiz_out(await db.quizzes.find_one({"id": qid}, {"_id": 0}), user)

@api.delete("/quizzes/{qid}")
async def delete_quiz(qid: str, user=Depends(require_roles("guru", "super_admin"))):
    qz = await db.quizzes.find_one({"id": qid})
    if not qz:
        raise HTTPException(404, "Quiz tidak ditemukan")
    if user["role"] != "super_admin" and qz.get("teacher_id") != user["id"]:
        raise HTTPException(403, "Hanya pembuat atau Super Admin yang dapat menghapus quiz ini")
    await db.quizzes.delete_one({"id": qid})
    await db.quiz_attempts.delete_many({"quiz_id": qid})
    await db.quiz_sessions.delete_many({"quiz_id": qid})
    return {"ok": True}

@api.post("/quizzes/attempt")
async def attempt_quiz(body: QuizAttemptIn, user=Depends(require_roles("siswa"))):
    quiz = await db.quizzes.find_one({"id": body.quiz_id})
    if not quiz: raise HTTPException(404, "Quiz tidak ditemukan")
    await assert_quiz_open_for_student(user, quiz)
    sess = await db.quiz_sessions.find_one({"quiz_id": body.quiz_id, "student_id": user["id"]})
    if quiz.get("time_limit"):
        if not sess:
            raise HTTPException(400, "Quiz belum dimulai")
        late = datetime.now(timezone.utc) - datetime.fromisoformat(sess["deadline"])
        if late.total_seconds() > QUIZ_GRACE_SECONDS:
            raise HTTPException(400, "Waktu pengerjaan quiz sudah habis")
    questions = quiz.get("questions", [])
    score = 0
    if sess:
        await db.quiz_sessions.delete_one({"quiz_id": body.quiz_id, "student_id": user["id"]})
        for i, q_idx in enumerate(sess.get("q_order", [])):
            if i >= len(body.answers) or body.answers[i] is None or body.answers[i] < 0:
                continue
            opts = sess["opt_orders"][i]
            chosen = opts[body.answers[i]] if body.answers[i] < len(opts) else None
            if chosen is not None and q_idx < len(questions) and questions[q_idx].get("answer") == chosen:
                score += 1
    else:
        for i, q in enumerate(questions):
            if i < len(body.answers) and body.answers[i] == q.get("answer"):
                score += 1
    total = len(questions)
    percent = (score / total * 100) if total else 0
    doc = {"id": str(uuid.uuid4()), "quiz_id": body.quiz_id, "student_id": user["id"],
           "student_name": user["name"], "score": score, "total": total, "percent": percent,
           "submitted_at": now_iso(), "is_demo": bool(user.get("is_demo"))}
    await db.quiz_attempts.replace_one({"quiz_id": body.quiz_id, "student_id": user["id"]}, doc, upsert=True)
    return {"score": score, "total": total, "percent": percent}

# ---------------- UJIAN (EXAMS, ANTI-CHEAT) ----------------
# An Ujian is like a Quiz but entry is ALWAYS password-gated; entering the correct
# password immediately starts the exam (creates a server session with a deadline).
# The frontend enforces fullscreen + tab-switch detection; after max_violations the
# exam auto-submits. Violations are also tracked server-side for the teacher.
class ExamIn(BaseModel):
    title: str
    kelas: str
    questions: List[QuizQuestion]
    subject: Optional[str] = None
    class_id: Optional[str] = None
    password: str                       # REQUIRED for exams
    time_limit: Optional[int] = None    # minutes; None/0 = no limit
    max_violations: Optional[int] = 3

class ExamUpdate(BaseModel):
    title: Optional[str] = None
    subject: Optional[str] = None
    questions: Optional[List[QuizQuestion]] = None
    password: Optional[str] = None
    time_limit: Optional[int] = None
    max_violations: Optional[int] = None

class ExamStartIn(BaseModel):
    password: str

class ExamAttemptIn(BaseModel):
    exam_id: str
    answers: List[int]
    violations: Optional[int] = 0
    auto_submitted: Optional[bool] = False

EXAM_STAFF = ("super_admin", "guru")
EXAM_GRACE_SECONDS = 20

def exam_out(ex: dict, user: dict) -> dict:
    ex["has_password"] = bool(ex.pop("password_hash", None))
    ex["question_count"] = len(ex.get("questions") or [])
    ex["max_violations"] = int(ex.get("max_violations", 3) or 3)
    # Students never receive questions or answers from the list endpoint; they only
    # get them from /start after entering the password.
    if user.get("role") not in EXAM_STAFF:
        for question in ex.get("questions", []):
            question.pop("answer", None)
        ex["questions"] = []
    return ex

@api.get("/exams")
async def list_exams(class_id: Optional[str] = None, subject: Optional[str] = None, user=Depends(get_current_user)):
    q = dict(dscope(user))
    if user["role"] == "siswa":
        q["kelas"] = user.get("kelas")
    if class_id:
        q["class_id"] = class_id
    if subject:
        q["subject"] = subject
    lock = await locked_class_query(user)
    if lock:
        q["$and"] = lock
    exams = await db.exams.find(q, {"_id": 0}).to_list(500)
    return [exam_out(ex, user) for ex in exams]

@api.post("/exams")
async def create_exam(body: ExamIn, user=Depends(require_roles("guru", "super_admin"))):
    await guru_assert_manages(user, body.class_id, body.kelas, body.subject)
    validate_time_limit(body.time_limit)
    pw = (body.password or "").strip()
    if not pw:
        raise HTTPException(400, "Ujian wajib memiliki password")
    data = body.model_dump()
    data.pop("password", None)
    doc = {"id": str(uuid.uuid4()), **data, "teacher_id": user["id"],
           "teacher_name": user["name"], "password_hash": hash_pw(pw), "created_at": now_iso()}
    doc["max_violations"] = int(body.max_violations or 3)
    dstamp(doc, user)
    await db.exams.insert_one(doc); doc.pop("_id", None)
    return exam_out(doc, user)

@api.patch("/exams/{eid}")
async def edit_exam(eid: str, body: ExamUpdate, user=Depends(require_roles("guru", "super_admin"))):
    ex = await db.exams.find_one({"id": eid})
    if not ex:
        raise HTTPException(404, "Ujian tidak ditemukan")
    if user["role"] != "super_admin" and ex.get("teacher_id") != user["id"]:
        raise HTTPException(403, "Hanya pembuat atau Super Admin yang dapat mengedit ujian ini")
    validate_time_limit(body.time_limit)
    upd = {k: v for k, v in body.model_dump(exclude={"password"}).items() if v is not None}
    if "time_limit" in upd or "questions" in upd or "max_violations" in upd:
        await db.exam_sessions.delete_many({"exam_id": eid})
    pw = (body.password or "").strip()
    if pw:
        upd["password_hash"] = hash_pw(pw)
    if upd:
        await db.exams.update_one({"id": eid}, {"$set": upd})
    return exam_out(await db.exams.find_one({"id": eid}, {"_id": 0}), user)

@api.delete("/exams/{eid}")
async def delete_exam(eid: str, user=Depends(require_roles("guru", "super_admin"))):
    ex = await db.exams.find_one({"id": eid})
    if not ex:
        raise HTTPException(404, "Ujian tidak ditemukan")
    if user["role"] != "super_admin" and ex.get("teacher_id") != user["id"]:
        raise HTTPException(403, "Hanya pembuat atau Super Admin yang dapat menghapus ujian ini")
    await db.exams.delete_one({"id": eid})
    await db.exam_attempts.delete_many({"exam_id": eid})
    await db.exam_sessions.delete_many({"exam_id": eid})
    return {"ok": True}

def shuffled_exam_questions(exam: dict, sess: dict) -> list:
    qs = exam.get("questions") or []
    out = []
    for q_idx in sess["q_order"]:
        q = qs[q_idx]
        opts = q.get("options") or []
        out.append({"q": q.get("q"), "options": [opts[o] for o in sess["opt_orders"][len(out)] if o < len(opts)]})
    return out

@api.post("/exams/{eid}/start")
async def start_exam(eid: str, body: ExamStartIn, user=Depends(require_roles("siswa"))):
    exam = await db.exams.find_one({"id": eid, **dscope(user)})
    if not exam:
        raise HTTPException(404, "Ujian tidak ditemukan")
    await assert_doc_class_unlocked(user, exam)
    # Already submitted? Block re-entry.
    done = await db.exam_attempts.find_one({"exam_id": eid, "student_id": user["id"]})
    if done:
        raise HTTPException(409, "Anda sudah mengerjakan ujian ini")
    # Password is required to start (this IS the entry gate).
    if not exam.get("password_hash") or not verify_pw(body.password, exam["password_hash"]):
        raise HTTPException(400, "Password ujian salah")
    limit = exam.get("time_limit") or 0
    now = datetime.now(timezone.utc)
    qs = exam.get("questions") or []
    sess = await db.exam_sessions.find_one({"exam_id": eid, "student_id": user["id"]}, {"_id": 0})
    if not sess or len(sess.get("q_order", [])) != len(qs):
        await db.exam_sessions.delete_one({"exam_id": eid, "student_id": user["id"]})
        q_order = list(range(len(qs))); random.shuffle(q_order)
        opt_orders = []
        for q in qs:
            o = list(range(len(q.get("options") or []))); random.shuffle(o); opt_orders.append(o)
        sess = {"exam_id": eid, "student_id": user["id"], "started_at": now.isoformat(),
                "deadline": (now + timedelta(minutes=limit)).isoformat() if limit else None,
                "q_order": q_order, "opt_orders": opt_orders, "violations": 0}
        await db.exam_sessions.insert_one(dict(sess))
    expired = bool(limit and now.isoformat() > sess["deadline"])
    return {"time_limit": limit, "started_at": sess["started_at"], "deadline": sess.get("deadline"),
            "server_now": now.isoformat(), "expired": expired,
            "max_violations": int(exam.get("max_violations", 3) or 3),
            "violations": int(sess.get("violations", 0)),
            "questions": [] if expired else shuffled_exam_questions(exam, sess)}

@api.post("/exams/{eid}/violation")
async def record_exam_violation(eid: str, user=Depends(require_roles("siswa"))):
    """Record one anti-cheat violation (tab switch / left fullscreen). Returns the
    running count and whether the student has exceeded the allowed maximum."""
    exam = await db.exams.find_one({"id": eid, **dscope(user)}, {"_id": 0, "max_violations": 1})
    if not exam:
        raise HTTPException(404, "Ujian tidak ditemukan")
    sess = await db.exam_sessions.find_one({"exam_id": eid, "student_id": user["id"]})
    if not sess:
        raise HTTPException(400, "Ujian belum dimulai")
    await db.exam_sessions.update_one({"exam_id": eid, "student_id": user["id"]},
                                      {"$inc": {"violations": 1}})
    count = int(sess.get("violations", 0)) + 1
    max_v = int(exam.get("max_violations", 3) or 3)
    return {"violations": count, "max_violations": max_v, "exceeded": count >= max_v}

@api.post("/exams/attempt")
async def attempt_exam(body: ExamAttemptIn, user=Depends(require_roles("siswa"))):
    exam = await db.exams.find_one({"id": body.exam_id})
    if not exam:
        raise HTTPException(404, "Ujian tidak ditemukan")
    await assert_doc_class_unlocked(user, exam)
    existing = await db.exam_attempts.find_one({"exam_id": body.exam_id, "student_id": user["id"]})
    if existing:
        raise HTTPException(409, "Anda sudah mengerjakan ujian ini")
    sess = await db.exam_sessions.find_one({"exam_id": body.exam_id, "student_id": user["id"]})
    if not sess:
        raise HTTPException(400, "Ujian belum dimulai")
    if exam.get("time_limit"):
        late = datetime.now(timezone.utc) - datetime.fromisoformat(sess["deadline"])
        if late.total_seconds() > EXAM_GRACE_SECONDS and not body.auto_submitted:
            raise HTTPException(400, "Waktu pengerjaan ujian sudah habis")
    questions = exam.get("questions", [])
    score = 0
    await db.exam_sessions.delete_one({"exam_id": body.exam_id, "student_id": user["id"]})
    for i, q_idx in enumerate(sess.get("q_order", [])):
        if i >= len(body.answers) or body.answers[i] is None or body.answers[i] < 0:
            continue
        opts = sess["opt_orders"][i]
        chosen = opts[body.answers[i]] if body.answers[i] < len(opts) else None
        if chosen is not None and q_idx < len(questions) and questions[q_idx].get("answer") == chosen:
            score += 1
    total = len(questions)
    percent = (score / total * 100) if total else 0
    violations = max(int(body.violations or 0), int(sess.get("violations", 0)))
    doc = {"id": str(uuid.uuid4()), "exam_id": body.exam_id, "student_id": user["id"],
           "student_name": user["name"], "score": score, "total": total, "percent": percent,
           "violations": violations, "auto_submitted": bool(body.auto_submitted),
           "submitted_at": now_iso(), "is_demo": bool(user.get("is_demo"))}
    await db.exam_attempts.replace_one({"exam_id": body.exam_id, "student_id": user["id"]}, doc, upsert=True)
    return {"score": score, "total": total, "percent": percent,
            "violations": violations, "auto_submitted": bool(body.auto_submitted)}

@api.get("/exams/{eid}/results")
async def exam_results(eid: str, user=Depends(get_current_user)):
    exam = await db.exams.find_one({"id": eid, **dscope(user)}, {"_id": 0})
    if not exam:
        raise HTTPException(404, "Ujian tidak ditemukan")
    if user["role"] == "siswa":
        att = await db.exam_attempts.find_one({"exam_id": eid, "student_id": user["id"]}, {"_id": 0})
        return {"mine": att}
    if user["role"] not in EXAM_STAFF:
        raise HTTPException(403, "Forbidden")
    attempts = await db.exam_attempts.find({"exam_id": eid}, {"_id": 0}).sort("submitted_at", -1).to_list(1000)
    return {"attempts": attempts}


class PostIn(BaseModel):
    image: str  # base64 or URL
    caption: str

@api.get("/posts")
async def list_posts(user=Depends(get_current_user)):
    posts = await db.posts.find(dscope(user), {"_id": 0}).sort("created_at", -1).to_list(200)
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
           "kelas": user.get("kelas"), "likes": [], "comments": [], "created_at": now_iso(),
           "is_demo": bool(user.get("is_demo"))}
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
    category: Optional[str] = "Umum"
    image: Optional[str] = None
    pinned: Optional[bool] = False
    show_on_login: Optional[bool] = False

class AnnouncementUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    scope: Optional[str] = None
    category: Optional[str] = None
    image: Optional[str] = None
    pinned: Optional[bool] = None
    show_on_login: Optional[bool] = None

LOGIN_BANNER_ROLES = ["super_admin", "kepsek", "staff_tu"]

@api.get("/announcements")
async def list_ann(user=Depends(get_current_user)):
    return await db.announcements.find(dscope(user), {"_id": 0}).sort([("pinned", -1), ("created_at", -1)]).to_list(200)

@api.get("/announcements/login")
async def login_banner_ann():
    return await db.announcements.find(
        {"show_on_login": True, "is_demo": {"$ne": True}},
        {"_id": 0, "id": 1, "title": 1, "content": 1, "category": 1, "created_at": 1}
    ).sort("created_at", -1).to_list(5)

@api.post("/announcements")
async def add_ann(body: AnnouncementIn, user=Depends(get_current_user)):
    if user["role"] not in ["super_admin", "kepsek", "ketua_osis", "ketua_kelas", "staff_tu", "guru"]:
        raise HTTPException(403, "Forbidden")
    if user["role"] not in LOGIN_BANNER_ROLES:
        body.show_on_login = False
    doc = {"id": str(uuid.uuid4()), **body.model_dump(), "author": user["name"],
           "author_id": user["id"], "role": user["role"], "created_at": now_iso()}
    dstamp(doc, user)
    await db.announcements.insert_one(doc); doc.pop("_id", None)
    # notify students
    student_ids = [u["id"] for u in await db.users.find({"role": "siswa", **dscope(user)}, {"id": 1}).to_list(2000)]
    await notify(student_ids, f"📢 {body.title}", body.content[:120], "/announcements")
    return doc

@api.patch("/announcements/{aid}")
async def edit_ann(aid: str, body: AnnouncementUpdate, user=Depends(get_current_user)):
    ann = await db.announcements.find_one({"id": aid})
    if not ann:
        raise HTTPException(404, "Pengumuman tidak ditemukan")
    if user["role"] != "super_admin" and ann.get("author_id") != user["id"]:
        raise HTTPException(403, "Tidak berwenang mengedit pengumuman ini")
    if user["role"] not in LOGIN_BANNER_ROLES:
        body.show_on_login = None
    upd = {k: v for k, v in body.model_dump().items() if v is not None}
    if upd:
        await db.announcements.update_one({"id": aid}, {"$set": upd})
    return await db.announcements.find_one({"id": aid}, {"_id": 0})

@api.delete("/announcements/{aid}")
async def del_ann(aid: str, user=Depends(get_current_user)):
    ann = await db.announcements.find_one({"id": aid})
    if not ann:
        raise HTTPException(404, "Pengumuman tidak ditemukan")
    if user["role"] != "super_admin" and ann.get("author_id") != user["id"]:
        raise HTTPException(403, "Tidak berwenang menghapus pengumuman ini")
    await db.announcements.delete_one({"id": aid})
    return {"ok": True}

# ---------------- UANG KAS ----------------
class KasIn(BaseModel):
    kelas: str = ""
    amount: float
    note: str = ""
    type: str = "masuk"  # masuk | keluar
    student_id: Optional[str] = None

class KasUpdate(BaseModel):
    kelas: Optional[str] = None
    amount: Optional[float] = None
    note: Optional[str] = None
    type: Optional[str] = None

def validate_tx(amount, type_):
    if amount is not None and amount <= 0:
        raise HTTPException(400, "Jumlah harus lebih dari 0")
    if type_ is not None and type_ not in ("masuk", "keluar"):
        raise HTTPException(400, "Tipe tidak valid")

async def kas_class_for_view(cid: str, user: dict) -> dict:
    klass = await db.classes.find_one({"id": cid})
    await assert_class_view(user, klass)
    await assert_class_unlocked(user, klass)
    return klass

def assert_kas_manager(user: dict, klass: dict):
    # Allowed: the ketua_kelas of this class, OR the appointed bendahara (treasurer) of this class.
    is_ketua = user.get("role") == "ketua_kelas" and user.get("kelas") == klass.get("name")
    is_bendahara = klass.get("treasurer_id") and user.get("id") == klass.get("treasurer_id")
    if not (is_ketua or is_bendahara):
        raise HTTPException(403, "Hanya Ketua Kelas atau Bendahara dari kelas ini yang dapat mengatur uang kas")

@api.put("/classes/{cid}/treasurer")
async def set_treasurer(cid: str, body: dict, user=Depends(get_current_user)):
    """Appoint a student of this class as Bendahara (treasurer). Allowed: super_admin or the ketua_kelas of this class."""
    klass = await db.classes.find_one({"id": cid})
    if not klass:
        raise HTTPException(404, "Kelas tidak ditemukan")
    is_ketua = user.get("role") == "ketua_kelas" and user.get("kelas") == klass.get("name")
    if user.get("role") != "super_admin" and not is_ketua:
        raise HTTPException(403, "Hanya Super Admin atau Ketua Kelas yang dapat menunjuk Bendahara")
    student_id = (body or {}).get("student_id")
    if not student_id:
        raise HTTPException(400, "student_id wajib diisi")
    st = await db.users.find_one({"id": student_id, "kelas": klass["name"], **dscope(user)}, {"_id": 0, "id": 1, "name": 1})
    if not st:
        raise HTTPException(400, "Siswa tidak ditemukan di kelas ini")
    await db.classes.update_one({"id": cid}, {"$set": {"treasurer_id": student_id, "treasurer_name": st["name"]}})
    return {"treasurer_id": student_id, "treasurer_name": st["name"]}

@api.delete("/classes/{cid}/treasurer")
async def remove_treasurer(cid: str, user=Depends(get_current_user)):
    klass = await db.classes.find_one({"id": cid})
    if not klass:
        raise HTTPException(404, "Kelas tidak ditemukan")
    is_ketua = user.get("role") == "ketua_kelas" and user.get("kelas") == klass.get("name")
    if user.get("role") != "super_admin" and not is_ketua:
        raise HTTPException(403, "Hanya Super Admin atau Ketua Kelas yang dapat menghapus Bendahara")
    await db.classes.update_one({"id": cid}, {"$unset": {"treasurer_id": "", "treasurer_name": ""}})
    return {"ok": True}

@api.get("/classes/{cid}/kas")
async def list_class_kas(cid: str, user=Depends(get_current_user)):
    await kas_class_for_view(cid, user)
    return await db.uang_kas.find({"class_id": cid}, {"_id": 0}).sort("created_at", -1).to_list(1000)

@api.post("/classes/{cid}/kas")
async def add_class_kas(cid: str, body: KasIn, user=Depends(get_current_user)):
    klass = await kas_class_for_view(cid, user)
    assert_kas_manager(user, klass)
    validate_tx(body.amount, body.type)
    data = body.model_dump()
    if data.get("student_id"):
        st = await db.users.find_one({"id": data["student_id"], "kelas": klass["name"], **dscope(user)}, {"_id": 0, "name": 1})
        if not st or body.type != "masuk":
            raise HTTPException(400, "Siswa tidak ditemukan di kelas ini / pembayaran harus bertipe masuk")
        data["student_name"] = st["name"]
    doc = {"id": str(uuid.uuid4()), **data, "kelas": klass["name"], "class_id": cid,
           "recorded_by": user["name"], "recorded_by_id": user["id"], "created_at": now_iso()}
    dstamp(doc, user)
    await db.uang_kas.insert_one(doc); doc.pop("_id", None)
    return doc

WIB = timezone(timedelta(hours=7))

def week_start_wib(dt: datetime) -> datetime:
    dt = dt.astimezone(WIB)
    return (dt - timedelta(days=dt.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)

async def class_students(klass: dict) -> list:
    q = {"role": {"$in": ["siswa", "ketua_kelas", "ketua_osis"]}, "kelas": klass["name"],
         "is_demo": True if klass.get("is_demo") else {"$ne": True}}
    return await db.users.find(q, {"_id": 0, "id": 1, "name": 1, "nisn": 1}).sort("name", 1).to_list(1000)

async def kas_paid_map(cid: str, start: datetime, end: datetime) -> dict:
    pays = await db.uang_kas.find({"class_id": cid, "type": "masuk", "student_id": {"$ne": None},
                                   "created_at": {"$gte": start.astimezone(timezone.utc).isoformat(),
                                                  "$lt": end.astimezone(timezone.utc).isoformat()}},
                                  {"_id": 0, "student_id": 1, "amount": 1}).to_list(5000)
    out = {}
    for p in pays:
        out[p["student_id"]] = out.get(p["student_id"], 0) + p["amount"]
    return out

async def kas_report_class(cid: str, user: dict) -> dict:
    klass = await kas_class_for_view(cid, user)
    if user.get("role") != "super_admin":
        assert_kas_manager(user, klass)
    return klass

@api.get("/classes/{cid}/kas/weekly")
async def weekly_kas_status(cid: str, user=Depends(get_current_user)):
    klass = await kas_report_class(cid, user)
    start = week_start_wib(datetime.now(timezone.utc))
    end = start + timedelta(days=7)
    students = await class_students(klass)
    paid_map = await kas_paid_map(cid, start, end)
    paid = [{**s, "amount": paid_map[s["id"]]} for s in students if s["id"] in paid_map]
    unpaid = [s for s in students if s["id"] not in paid_map]
    return {"week_start": start.date().isoformat(), "week_end": (end - timedelta(days=1)).date().isoformat(),
            "total": len(students), "paid": paid, "unpaid": unpaid}

@api.get("/classes/{cid}/kas/monthly")
async def monthly_kas_recap(cid: str, month: Optional[str] = None, user=Depends(get_current_user)):
    klass = await kas_report_class(cid, user)
    now = datetime.now(WIB)
    try:
        y, m = (int(x) for x in (month or now.strftime("%Y-%m")).split("-"))
        first = datetime(y, m, 1, tzinfo=WIB)
    except ValueError:
        raise HTTPException(400, "Format bulan harus YYYY-MM")
    nxt = datetime(y + (m == 12), m % 12 + 1, 1, tzinfo=WIB)
    cur_week = week_start_wib(now)
    weeks, ws = [], week_start_wib(first)
    while ws < nxt:
        weeks.append(ws)
        ws += timedelta(days=7)
    students = await class_students(klass)
    week_maps = [await kas_paid_map(cid, w, w + timedelta(days=7)) for w in weeks]
    rows = []
    for st in students:
        cells = []
        for w, pm in zip(weeks, week_maps):
            amt = pm.get(st["id"], 0)
            cells.append({"amount": amt, "status": "paid" if amt else ("future" if w > cur_week else "unpaid")})
        rows.append({**st, "weeks": cells, "paid_count": sum(1 for c in cells if c["status"] == "paid"),
                     "total_amount": sum(c["amount"] for c in cells)})
    return {"month": f"{y:04d}-{m:02d}", "current_week_start": cur_week.date().isoformat(),
            "weeks": [{"start": w.date().isoformat(), "end": (w + timedelta(days=6)).date().isoformat(),
                       "label": f"Minggu {i + 1}"} for i, w in enumerate(weeks)],
            "students": rows}

# ---------------- CRON: Friday kas reminder ----------------
async def run_kas_reminder():
    start = week_start_wib(datetime.now(timezone.utc))
    end = start + timedelta(days=7)
    class_ids = await db.uang_kas.distinct("class_id", {"student_id": {"$ne": None}})
    sent = 0
    for cid in class_ids:
        klass = await db.classes.find_one({"id": cid}, {"_id": 0})
        if not klass:
            continue
        paid = await kas_paid_map(cid, start, end)
        unpaid = [s["id"] for s in await class_students(klass) if s["id"] not in paid]
        if unpaid:
            await notify(unpaid, f"Pengingat Kas {klass['name']}",
                         "Kamu belum membayar uang kas minggu ini. Segera setor ke Ketua Kelas ya!",
                         f"/classes/{cid}")
            sent += len(unpaid)
    logger.info("Kas reminder: %s notifikasi terkirim", sent)

@api.post("/cron/kas-reminder")
async def cron_kas_reminder(request: Request, bg: BackgroundTasks):
    # Cron endpoints must ack 2xx immediately; enqueue/background the actual work.
    secret = os.environ.get("WEBHOOK_CRON_SECRET", "")
    auth = request.headers.get("Authorization", "")
    if not secret or not auth.startswith("Bearer ") or not hmac.compare_digest(auth[7:], secret):
        raise HTTPException(401, "Unauthorized")
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(400, "Invalid body")
    run_id = request.headers.get("X-Webhook-Id") or (body or {}).get("run_id")
    if not run_id:
        raise HTTPException(400, "Missing run id")
    if await db.cron_runs.find_one({"run_id": run_id}):
        return {"ok": True, "duplicate": True}
    await db.cron_runs.insert_one({"run_id": run_id, "job": "kas-reminder", "created_at": now_iso()})
    bg.add_task(run_kas_reminder)
    return {"ok": True}

@api.get("/classes/{cid}/kas/chart")
async def kas_chart(cid: str, months: int = 6, user=Depends(get_current_user)):
    await kas_class_for_view(cid, user)
    months = max(3, min(months, 12))
    now = datetime.now(WIB)
    first = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    for _ in range(months - 1):
        prev = first - timedelta(days=1)
        first = prev.replace(day=1)
    pays = await db.uang_kas.find({"class_id": cid, "created_at": {"$gte": first.astimezone(timezone.utc).isoformat()}},
                                  {"_id": 0, "amount": 1, "type": 1, "created_at": 1}).to_list(5000)
    buckets, labels = {}, []
    cur = first
    for _ in range(months):
        key = cur.strftime("%Y-%m")
        buckets[key] = {"month": key, "masuk": 0.0, "keluar": 0.0}
        labels.append(key)
        nxt_month = cur.replace(day=28) + timedelta(days=7)
        cur = nxt_month.replace(day=1)
    for t in pays:
        key = datetime.fromisoformat(t["created_at"]).astimezone(WIB).strftime("%Y-%m")
        b = buckets.get(key)
        if b:
            b["masuk" if t.get("type") == "masuk" else "keluar"] += t.get("amount") or 0
    return [buckets[k] for k in labels]

async def kas_tx_for_manage(kid: str, user: dict) -> dict:
    tx = await db.uang_kas.find_one({"id": kid})
    if not tx or not tx.get("class_id"):
        raise HTTPException(404, "Transaksi tidak ditemukan")
    klass = await kas_class_for_view(tx["class_id"], user)
    assert_kas_manager(user, klass)
    return tx

@api.patch("/kas/{kid}")
async def edit_kas(kid: str, body: KasUpdate, user=Depends(get_current_user)):
    await kas_tx_for_manage(kid, user)
    validate_tx(body.amount, body.type)
    upd = {k: v for k, v in body.model_dump(exclude={"kelas"}).items() if v is not None}
    if upd:
        upd["updated_at"] = now_iso()
        await db.uang_kas.update_one({"id": kid}, {"$set": upd})
    return await db.uang_kas.find_one({"id": kid}, {"_id": 0})

@api.delete("/kas/{kid}")
async def delete_kas(kid: str, user=Depends(get_current_user)):
    await kas_tx_for_manage(kid, user)
    await db.uang_kas.delete_one({"id": kid})
    return {"ok": True}

# ---------------- SOCIAL FUND ----------------
@api.get("/social-fund")
async def list_sf(user=Depends(get_current_user)):
    return await db.social_fund.find(dscope(user), {"_id": 0}).sort("created_at", -1).to_list(500)

@api.post("/social-fund")
async def add_sf(body: KasIn, user=Depends(require_roles("ketua_osis", "super_admin"))):
    validate_tx(body.amount, body.type)
    doc = {"id": str(uuid.uuid4()), **body.model_dump(),
           "recorded_by": user["name"], "created_at": now_iso()}
    dstamp(doc, user)
    await db.social_fund.insert_one(doc); doc.pop("_id", None)
    return doc

@api.patch("/social-fund/{sid}")
async def edit_sf(sid: str, body: KasUpdate, user=Depends(require_roles("ketua_osis", "super_admin"))):
    if not await db.social_fund.find_one({"id": sid, **dscope(user)}):
        raise HTTPException(404, "Transaksi tidak ditemukan")
    validate_tx(body.amount, body.type)
    upd = {k: v for k, v in body.model_dump().items() if v is not None}
    if upd:
        upd["updated_at"] = now_iso()
        await db.social_fund.update_one({"id": sid}, {"$set": upd})
    return await db.social_fund.find_one({"id": sid}, {"_id": 0})

@api.delete("/social-fund/{sid}")
async def delete_sf(sid: str, user=Depends(require_roles("ketua_osis", "super_admin"))):
    res = await db.social_fund.delete_one({"id": sid, **dscope(user)})
    if not res.deleted_count:
        raise HTTPException(404, "Transaksi tidak ditemukan")
    return {"ok": True}

# ---------------- OSIS ELECTIONS ----------------
class CandidateIn(BaseModel):
    name: str
    position: str  # ketua | wakil | anggota
    vision: str
    mission: str
    photo: Optional[str] = None

@api.get("/candidates")
async def list_candidates(user=Depends(get_current_user)):
    cands = await db.candidates.find(dscope(user), {"_id": 0}).to_list(200)
    for c in cands:
        c["vote_count"] = await db.votes.count_documents({"candidate_id": c["id"]})
    return cands

@api.post("/candidates")
async def add_candidate(body: CandidateIn, user=Depends(require_roles("super_admin", "ketua_osis"))):
    if body.position not in ("ketua", "wakil"):
        raise HTTPException(400, "Posisi kandidat hanya Ketua atau Wakil. Anggota tidak dapat menjadi kandidat.")
    doc = {"id": str(uuid.uuid4()), **body.model_dump(), "created_at": now_iso()}
    dstamp(doc, user)
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
                                "created_at": now_iso(), "is_demo": bool(user.get("is_demo"))})
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
    dstamp(doc, user)
    await db.feedback.insert_one(doc); doc.pop("_id", None)
    return doc

@api.get("/feedback")
async def list_feedback(user=Depends(require_roles("super_admin", "kepsek"))):
    return await db.feedback.find(dscope(user), {"_id": 0}).sort("created_at", -1).to_list(500)

@api.delete("/feedback/{fid}")
async def delete_feedback(fid: str, user=Depends(require_roles("super_admin", "kepsek"))):
    res = await db.feedback.delete_one({"id": fid, **dscope(user)})
    if not res.deleted_count:
        raise HTTPException(404, "Masukan tidak ditemukan")
    return {"ok": True}

# ---------------- ACHIEVEMENTS ----------------
@api.get("/achievements")
async def achievements(user=Depends(get_current_user)):
    # Most diligent = highest submission count
    sub_pipeline = [{"$match": dscope(user)},
                    {"$group": {"_id": "$student_id", "count": {"$sum": 1}, "name": {"$first": "$student_name"}}},
                    {"$sort": {"count": -1}}, {"$limit": 10}]
    diligent = await db.submissions.aggregate(sub_pipeline).to_list(10)
    # Top academic = avg quiz percent
    quiz_pipeline = [{"$match": dscope(user)},
                     {"$group": {"_id": "$student_id", "avg": {"$avg": "$percent"},
                                  "name": {"$first": "$student_name"}, "count": {"$sum": 1}}},
                     {"$sort": {"avg": -1}}, {"$limit": 10}]
    academic = await db.quiz_attempts.aggregate(quiz_pipeline).to_list(10)
    return {"most_diligent": diligent, "top_academic": academic}

# ---------------- STATS ----------------
@api.get("/stats")
async def stats(user=Depends(get_current_user)):
    ds = dscope(user)
    return {
        "users": await db.users.count_documents(ds),
        "siswa": await db.users.count_documents({"role": "siswa", **ds}),
        "guru": await db.users.count_documents({"role": "guru", **ds}),
        "inventory": await db.inventory.count_documents(ds),
        "assignments": await db.assignments.count_documents(ds),
        "quizzes": await db.quizzes.count_documents(ds),
        "posts": await db.posts.count_documents(ds),
        "pending_borrow": await db.borrow_requests.count_documents({"status": "Menunggu Approval", **ds}),
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
        pipe = [{"$match": {"date": d, **dscope(user)}}, {"$group": {"_id": "$status", "n": {"$sum": 1}}}]
        agg = await db.attendance.aggregate(pipe).to_list(10)
        row = {"date": d, "hadir": 0, "izin": 0, "sakit": 0, "alpa": 0}
        for r in agg: row[r["_id"]] = r["n"]
        trend.append(row)
    # Quiz score distribution buckets
    buckets = [{"range": "0-40", "count": 0}, {"range": "41-60", "count": 0},
               {"range": "61-80", "count": 0}, {"range": "81-100", "count": 0}]
    async for a in db.quiz_attempts.find(dscope(user), {"percent": 1}):
        p = a.get("percent", 0)
        idx = 0 if p <= 40 else 1 if p <= 60 else 2 if p <= 80 else 3
        buckets[idx]["count"] += 1
    # Class activity ranking (posts + submissions + quiz attempts by kelas of student)
    class_rank = {}
    users_by_id = {u["id"]: u.get("kelas") for u in await db.users.find({"role": "siswa", **dscope(user)}, {"id": 1, "kelas": 1}).to_list(1000)}
    for coll in ["submissions", "quiz_attempts"]:
        async for r in db[coll].find(dscope(user), {"student_id": 1}):
            k = users_by_id.get(r.get("student_id"))
            if k: class_rank[k] = class_rank.get(k, 0) + 1
    async for p in db.posts.find(dscope(user), {"kelas": 1}):
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
        logger.warning("Reset email not sent: email key or https FRONTEND_URL missing")
        return False
    brand = escape(from_name)
    html = (f'<div style="font-family:Arial;padding:24px;max-width:560px;margin:auto">'
            f'<h2 style="color:#0284C7">Reset Password {brand}</h2>'
            f'<p>Halo, kami menerima permintaan reset password untuk akun Anda di <b>{brand}</b>.</p>'
            f'<p><a href="{escape(link)}" style="display:inline-block;padding:12px 24px;background:#0F172A;color:white;text-decoration:none;border-radius:8px">Reset Password Saya</a></p>'
            f'<p style="color:#64748B;font-size:12px">Link berlaku 1 jam dan hanya bisa dipakai sekali. '
            f'Abaikan email ini jika Anda tidak meminta reset — password Anda tetap aman.</p>'
            f'<p style="color:#94A3B8;font-size:11px;margin-top:24px">— Tim {brand}. Kami tidak pernah meminta password lewat email.</p></div>')
    subject = f"Reset password {from_name}"
    try:
        assert_safe_email(subject, html)
        async with httpx.AsyncClient(timeout=30) as c:
            r = await c.post(f"{EMAIL_BASE_URL}/api/v1/email/send",
                             headers={"X-Email-Key": key},
                             json={"to": [to_email], "subject": subject,
                                   "html": html, "from_name": from_name})
        r.raise_for_status()
        logger.info("Reset email sent to %s", to_email)
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
        assert_safe_email(subject, html)
        async with httpx.AsyncClient(timeout=30) as c:
            r = await c.post(f"{EMAIL_BASE_URL}/api/v1/email/send",
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
            f'<p style="margin-top:20px;color:#64748B;font-size:12px">Rapor ini digenerasi otomatis oleh sistem SMA NEGERI 1 LAGUBOTI. '
            f'Silakan hubungi wali kelas untuk klarifikasi lebih lanjut.</p></div></div>')
    bg.add_task(send_email, to, f"Rapor Digital - {s['name']}", html)
    return {"ok": True, "sent_to": to}

# ---------------- CALENDAR / EVENTS ----------------
class EventIn(BaseModel):
    title: str
    description: str = ""
    date: str  # YYYY-MM-DD
    type: str = "event"  # event | ujian | libur | rapat
    kelas: Optional[str] = None  # None = seluruh sekolah

@api.get("/events")
async def list_events(month: Optional[str] = None, user=Depends(get_current_user)):
    q = dscope(user)
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
    dstamp(doc, user)
    await db.events.insert_one(doc); doc.pop("_id", None)
    # notify all students (+ orang tua)
    audience_q = {"role": {"$in": ["siswa", "orang_tua"]}, **dscope(user)}
    if body.kelas:
        # only students of that kelas + linked parents
        student_ids = [s["id"] for s in await db.users.find({"role": "siswa", "kelas": body.kelas, **dscope(user)}, {"id": 1}).to_list(500)]
        parents = [p["id"] for p in await db.users.find({"role": "orang_tua", "student_id": {"$in": student_ids}, **dscope(user)}, {"id": 1}).to_list(500)]
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
    pdf.cell(180, 8, "SMA NEGERI 1 LAGUBOTI - Rapor Digital", ln=1)
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
    pdf.cell(0, 5, f"Digenerasi otomatis oleh SMA NEGERI 1 LAGUBOTI pada {report['generated_at']}", align="C", ln=1)
    pdf.cell(0, 5, "Silakan hubungi wali kelas untuk klarifikasi lebih lanjut.", align="C")
    out = pdf.output(dest="S")
    return bytes(out) if not isinstance(out, bytes) else out

@api.get("/reports/batch/zip")
async def batch_reports(kelas: str, user=Depends(require_roles("guru","kepsek","super_admin"))):
    students = await db.users.find({"role": "siswa", "kelas": kelas, **dscope(user)}, {"password_hash": 0, "_id": 0}).to_list(500)
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

@api.get("/classes/{cid}/kas/export")
async def export_kas(cid: str, user=Depends(get_current_user)):
    klass = await kas_class_for_view(cid, user)
    kelas = klass["name"]
    q = {"class_id": cid}
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
    docs = await db.inventory.find(dscope(user), {"_id": 0}).to_list(1000)
    pipeline = [{"$match": {"status": "Disetujui", **dscope(user)}},
                {"$group": {"_id": "$item_id", "n": {"$sum": "$quantity"}}}]
    agg = await db.borrow_requests.aggregate(pipeline).to_list(1000)
    out_map = {a["_id"]: a["n"] for a in agg}
    columns = ["Kode", "Nama Barang", "Kategori", "Kondisi", "Lokasi", "Stok Tersedia", "Dipinjam", "Total", "Min. Stok", "Keterangan"]
    rows = []
    for d in sorted(docs, key=lambda x: (x.get("name") or "").lower()):
        out = int(out_map.get(d["id"], 0))
        rows.append({"Kode": d.get("code") or "-", "Nama Barang": d.get("name"),
                     "Kategori": d.get("category") or "-", "Kondisi": d.get("condition") or "-",
                     "Lokasi": d.get("location") or "-", "Stok Tersedia": d.get("stock", 0),
                     "Dipinjam": out, "Total": int(d.get("stock", 0)) + out,
                     "Min. Stok": int(d.get("min_stock", 0) or 0), "Keterangan": d.get("description") or "-"})
    summary = {"Total Item": len(docs), "Total Stok": sum(d.get("stock", 0) for d in docs)}
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

# ==================== SMART LIBRARY (PERPUSTAKAAN PINTAR) ====================
from datetime import timedelta, date as _date

LIB_DEFAULTS = {"loan_days": 7, "max_books": 3, "fine_per_day": 500, "currency": "Rp"}
LIB_MANAGE = require_roles("admin_perpus")  # super_admin auto-allowed by require_roles

async def get_lib_config():
    doc = await db.library_config.find_one({"_id": "singleton"})
    if not doc:
        await db.library_config.insert_one({"_id": "singleton", **LIB_DEFAULTS})
        return LIB_DEFAULTS.copy()
    doc.pop("_id", None)
    return {**LIB_DEFAULTS, **doc}

class BookIn(BaseModel):
    title: str
    author: Optional[str] = ""
    isbn: Optional[str] = None
    category: Optional[str] = "Umum"
    publisher: Optional[str] = None
    year: Optional[int] = None
    total_copies: int = 1
    location: Optional[str] = None       # lokasi rak
    cover_url: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None

class BookUpdate(BaseModel):
    title: Optional[str] = None
    author: Optional[str] = None
    isbn: Optional[str] = None
    category: Optional[str] = None
    publisher: Optional[str] = None
    year: Optional[int] = None
    total_copies: Optional[int] = None
    location: Optional[str] = None
    cover_url: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None

class LoanIn(BaseModel):
    book_id: str
    student_id: Optional[str] = None     # admin desk borrows on behalf of a student

class ReviewIn(BaseModel):
    rating: int
    text: Optional[str] = ""

class LibConfigUpdate(BaseModel):
    loan_days: Optional[int] = None
    max_books: Optional[int] = None
    fine_per_day: Optional[int] = None

# ---- specific routes BEFORE /books/{bid} ----
@api.get("/library/config")
async def lib_config(user=Depends(get_current_user)):
    return await get_lib_config()

@api.patch("/library/config")
async def lib_config_update(body: LibConfigUpdate, user=Depends(LIB_MANAGE)):
    upd = {k: v for k, v in body.model_dump().items() if v is not None}
    if upd:
        await db.library_config.update_one({"_id": "singleton"}, {"$set": upd}, upsert=True)
    return await get_lib_config()

@api.get("/books/categories")
async def book_categories(user=Depends(get_current_user)):
    cats = await db.books.distinct("category", dscope(user))
    return sorted([c for c in cats if c])

@api.get("/library/stats")
async def library_stats(user=Depends(LIB_MANAGE)):
    scope = dscope(user)
    books = await db.books.find(scope, {"_id": 0}).to_list(5000)
    total_titles = len(books)
    total_copies = sum(int(b.get("total_copies", 0) or 0) for b in books)
    available = sum(int(b.get("available_copies", 0) or 0) for b in books)
    borrowed = await db.loans.count_documents({**scope, "status": "dipinjam"})
    today = datetime.now(timezone.utc).date().isoformat()
    overdue = await db.loans.count_documents({**scope, "status": "dipinjam", "due_date": {"$lt": today}})
    reservations = await db.reservations.count_documents({**scope, "status": "menunggu"})
    returns_today = await db.loans.count_documents({**scope, "status": "dikembalikan", "returned_at": {"$gte": today}})
    popular = sorted(books, key=lambda b: b.get("borrow_count", 0), reverse=True)[:5]
    popular = [{"id": b["id"], "title": b["title"], "author": b.get("author"),
                "cover_url": b.get("cover_url"), "borrow_count": b.get("borrow_count", 0)} for b in popular]
    by_cat = {}
    for b in books:
        by_cat[b.get("category") or "Umum"] = by_cat.get(b.get("category") or "Umum", 0) + 1
    return {"total_titles": total_titles, "total_copies": total_copies, "available": available,
            "borrowed": borrowed, "overdue": overdue, "reservations": reservations,
            "returns_today": returns_today, "popular": popular,
            "by_category": [{"name": k, "value": v} for k, v in sorted(by_cat.items())]}

@api.get("/library/popular")
async def library_popular(user=Depends(get_current_user)):
    books = await db.books.find(dscope(user), {"_id": 0}).sort("borrow_count", -1).to_list(8)
    return books

@api.get("/books")
async def list_books(q: Optional[str] = None, category: Optional[str] = None,
                     available: Optional[str] = None, user=Depends(get_current_user)):
    query = dscope(user)
    if q:
        rx = {"$regex": q, "$options": "i"}
        query["$or"] = [{"title": rx}, {"author": rx}, {"isbn": rx}, {"category": rx}, {"tags": rx}]
    if category and category not in ("", "Semua"):
        query["category"] = category
    if available == "true":
        query["available_copies"] = {"$gt": 0}
    return await db.books.find(query, {"_id": 0}).sort("title", 1).to_list(1000)

@api.get("/books/{bid}")
async def get_book(bid: str, user=Depends(get_current_user)):
    b = await db.books.find_one({"id": bid}, {"_id": 0})
    if not b:
        raise HTTPException(404, "Buku tidak ditemukan")
    reviews = await db.book_reviews.find({"book_id": bid}, {"_id": 0}).sort("created_at", -1).to_list(200)
    b["reviews"] = reviews
    b["rating_avg"] = round(sum(r["rating"] for r in reviews) / len(reviews), 1) if reviews else 0
    b["rating_count"] = len(reviews)
    return b

@api.post("/books")
async def create_book(body: BookIn, user=Depends(LIB_MANAGE)):
    tc = max(1, int(body.total_copies or 1))
    doc = {"id": str(uuid.uuid4()), **body.model_dump(), "total_copies": tc,
           "available_copies": tc, "borrow_count": 0, "created_at": now_iso()}
    dstamp(doc, user)
    await db.books.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.patch("/books/{bid}")
async def update_book(bid: str, body: BookUpdate, user=Depends(LIB_MANAGE)):
    book = await db.books.find_one({"id": bid})
    if not book:
        raise HTTPException(404, "Buku tidak ditemukan")
    upd = {k: v for k, v in body.model_dump().items() if v is not None}
    if "total_copies" in upd:
        new_total = max(0, int(upd["total_copies"]))
        delta = new_total - int(book.get("total_copies", 0))
        new_avail = max(0, int(book.get("available_copies", 0)) + delta)
        upd["total_copies"] = new_total
        upd["available_copies"] = new_avail
    if upd:
        await db.books.update_one({"id": bid}, {"$set": upd})
    return await db.books.find_one({"id": bid}, {"_id": 0})

@api.delete("/books/{bid}")
async def delete_book(bid: str, user=Depends(LIB_MANAGE)):
    active = await db.loans.count_documents({"book_id": bid, "status": "dipinjam"})
    if active > 0:
        raise HTTPException(400, f"Tidak bisa menghapus: masih ada {active} eksemplar dipinjam")
    await db.books.delete_one({"id": bid})
    await db.reservations.delete_many({"book_id": bid})
    return {"ok": True}

# ---- LOANS (sirkulasi) ----
@api.get("/loans/my")
async def my_loans(user=Depends(get_current_user)):
    loans = await db.loans.find({"borrower_id": user["id"]}, {"_id": 0}).sort("borrowed_at", -1).to_list(500)
    today = datetime.now(timezone.utc).date()
    for l in loans:
        if l.get("status") == "dipinjam":
            due = _date.fromisoformat(l["due_date"])
            l["overdue"] = today > due
            l["days_late"] = max(0, (today - due).days)
    return loans

@api.get("/loans")
async def list_loans(status: Optional[str] = None, user=Depends(get_current_user)):
    q = dscope(user)
    if user["role"] not in ("admin_perpus", "super_admin"):
        q["borrower_id"] = user["id"]
    if status == "active":
        q["status"] = "dipinjam"
    elif status == "returned":
        q["status"] = "dikembalikan"
    loans = await db.loans.find(q, {"_id": 0}).sort("borrowed_at", -1).to_list(3000)
    today = datetime.now(timezone.utc).date()
    for l in loans:
        if l.get("status") == "dipinjam":
            due = _date.fromisoformat(l["due_date"])
            l["overdue"] = today > due
            l["days_late"] = max(0, (today - due).days)
    return loans

@api.post("/loans")
async def borrow_book(body: LoanIn, user=Depends(get_current_user)):
    cfg = await get_lib_config()
    if body.student_id:
        if user["role"] not in ("admin_perpus", "super_admin"):
            raise HTTPException(403, "Hanya Admin Perpus yang bisa meminjamkan atas nama siswa")
        borrower = await db.users.find_one({"id": body.student_id, **dscope(user)})
        if not borrower:
            raise HTTPException(404, "Siswa tidak ditemukan")
    else:
        borrower = user
    book = await db.books.find_one({"id": body.book_id, **dscope(user)})
    if not book:
        raise HTTPException(404, "Buku tidak ditemukan")
    if int(book.get("available_copies", 0)) <= 0:
        raise HTTPException(400, "Stok buku habis / sedang dipinjam semua")
    active = await db.loans.count_documents({"borrower_id": borrower["id"], "status": "dipinjam"})
    if active >= int(cfg["max_books"]):
        raise HTTPException(400, f"Batas maksimal {cfg['max_books']} buku per anggota sudah tercapai")
    dup = await db.loans.find_one({"borrower_id": borrower["id"], "book_id": book["id"], "status": "dipinjam"})
    if dup:
        raise HTTPException(400, "Anggota masih meminjam judul yang sama")
    now = datetime.now(timezone.utc)
    due = now + timedelta(days=int(cfg["loan_days"]))
    loan = {"id": str(uuid.uuid4()), "book_id": book["id"], "book_title": book["title"],
            "book_cover": book.get("cover_url"), "borrower_id": borrower["id"],
            "borrower_name": borrower["name"], "kelas": borrower.get("kelas"),
            "borrowed_at": now_iso(), "due_date": due.date().isoformat(), "returned_at": None,
            "status": "dipinjam", "fine": 0, "days_late": 0, "handled_by": user["name"]}
    dstamp(loan, user)
    await db.loans.insert_one(loan)
    loan.pop("_id", None)
    await db.books.update_one({"id": book["id"]}, {"$inc": {"available_copies": -1, "borrow_count": 1}})
    # fulfil reservation if borrower had one
    await db.reservations.update_many(
        {"book_id": book["id"], "user_id": borrower["id"], "status": "menunggu"},
        {"$set": {"status": "selesai"}})
    return loan

@api.post("/loans/{lid}/return")
async def return_book(lid: str, user=Depends(get_current_user)):
    loan = await db.loans.find_one({"id": lid})
    if not loan:
        raise HTTPException(404, "Data peminjaman tidak ditemukan")
    if user["role"] not in ("admin_perpus", "super_admin") and loan["borrower_id"] != user["id"]:
        raise HTTPException(403, "Tidak berwenang")
    if loan["status"] == "dikembalikan":
        return {"ok": True, "fine": loan.get("fine", 0), "days_late": loan.get("days_late", 0)}
    cfg = await get_lib_config()
    today = datetime.now(timezone.utc).date()
    due = _date.fromisoformat(loan["due_date"])
    days_late = max(0, (today - due).days)
    fine = days_late * int(cfg["fine_per_day"])
    await db.loans.update_one({"id": lid}, {"$set": {"status": "dikembalikan",
                              "returned_at": now_iso(), "fine": fine, "days_late": days_late}})
    await db.books.update_one({"id": loan["book_id"]}, {"$inc": {"available_copies": 1}})
    nextq = await db.reservations.find_one({"book_id": loan["book_id"], "status": "menunggu"}, sort=[("created_at", 1)])
    if nextq:
        await notify([nextq["user_id"]], "📚 Buku tersedia",
                     f"Buku '{loan['book_title']}' yang Anda reservasi kini tersedia untuk dipinjam.", "/library")
    return {"ok": True, "fine": fine, "days_late": days_late}

@api.get("/library/loans/export")
async def export_loans(user=Depends(LIB_MANAGE)):
    docs = await db.loans.find(dscope(user), {"_id": 0}).sort("borrowed_at", -1).to_list(5000)
    columns = ["Judul Buku", "Peminjam", "Kelas", "Tgl Pinjam", "Jatuh Tempo", "Dikembalikan", "Status", "Telat (hari)", "Denda"]
    rows = [{"Judul Buku": d.get("book_title"), "Peminjam": d.get("borrower_name"),
             "Kelas": d.get("kelas") or "-", "Tgl Pinjam": (d.get("borrowed_at") or "")[:10],
             "Jatuh Tempo": d.get("due_date") or "-",
             "Dikembalikan": (d.get("returned_at") or "-")[:10],
             "Status": (d.get("status") or "").upper(), "Telat (hari)": d.get("days_late", 0),
             "Denda": d.get("fine", 0)} for d in docs]
    summary = {"Total Transaksi": len(docs),
               "Sedang Dipinjam": sum(1 for d in docs if d.get("status") == "dipinjam"),
               "Dikembalikan": sum(1 for d in docs if d.get("status") == "dikembalikan"),
               "Total Denda": sum(int(d.get("fine", 0) or 0) for d in docs)}
    data = pretty_excel("Laporan Sirkulasi Perpustakaan",
                        f"Diekspor oleh {user['name']} pada {now_iso()[:19].replace('T',' ')}",
                        columns, rows, summary, "Sirkulasi")
    return xlsx_response(data, "Perpustakaan_Sirkulasi.xlsx")

# ---- RESERVATIONS ----
@api.get("/reservations")
async def list_reservations(user=Depends(get_current_user)):
    q = dscope(user)
    if user["role"] not in ("admin_perpus", "super_admin"):
        q["user_id"] = user["id"]
    return await db.reservations.find(q, {"_id": 0}).sort("created_at", 1).to_list(1000)

@api.post("/books/{bid}/reserve")
async def reserve_book(bid: str, user=Depends(get_current_user)):
    book = await db.books.find_one({"id": bid, **dscope(user)})
    if not book:
        raise HTTPException(404, "Buku tidak ditemukan")
    if int(book.get("available_copies", 0)) > 0:
        raise HTTPException(400, "Buku tersedia — silakan langsung pinjam")
    dup = await db.reservations.find_one({"book_id": bid, "user_id": user["id"], "status": "menunggu"})
    if dup:
        raise HTTPException(400, "Anda sudah mereservasi buku ini")
    doc = {"id": str(uuid.uuid4()), "book_id": bid, "book_title": book["title"],
           "book_cover": book.get("cover_url"), "user_id": user["id"], "user_name": user["name"],
           "kelas": user.get("kelas"), "status": "menunggu", "created_at": now_iso()}
    dstamp(doc, user)
    await db.reservations.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.delete("/reservations/{rid}")
async def cancel_reservation(rid: str, user=Depends(get_current_user)):
    r = await db.reservations.find_one({"id": rid})
    if not r:
        raise HTTPException(404, "Reservasi tidak ditemukan")
    if user["role"] not in ("admin_perpus", "super_admin") and r["user_id"] != user["id"]:
        raise HTTPException(403, "Tidak berwenang")
    await db.reservations.delete_one({"id": rid})
    return {"ok": True}

# ---- REVIEWS ----
@api.post("/books/{bid}/review")
async def add_review(bid: str, body: ReviewIn, user=Depends(get_current_user)):
    if body.rating < 1 or body.rating > 5:
        raise HTTPException(400, "Rating harus 1-5")
    book = await db.books.find_one({"id": bid, **dscope(user)})
    if not book:
        raise HTTPException(404, "Buku tidak ditemukan")
    doc = {"book_id": bid, "user_id": user["id"], "user_name": user["name"],
           "rating": body.rating, "text": (body.text or "").strip(), "created_at": now_iso()}
    dstamp(doc, user)
    await db.book_reviews.update_one({"book_id": bid, "user_id": user["id"]}, {"$set": doc}, upsert=True)
    doc["id"] = str(uuid.uuid4())
    doc.pop("_id", None)
    return doc

# ---- AI (Perpustakaan Pintar) ----
async def _ai_text(system: str, prompt: str, session: str) -> str:
    if not EMERGENT_KEY:
        raise HTTPException(400, "Fitur AI belum aktif: EMERGENT_LLM_KEY belum diset")
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    chat = LlmChat(api_key=EMERGENT_KEY, session_id=session, system_message=system).with_model("openai", "gpt-5.4")
    resp = await chat.send_message(UserMessage(text=prompt))
    return resp if isinstance(resp, str) else getattr(resp, "text", str(resp))

@api.post("/books/{bid}/ai-summary")
async def ai_book_summary(bid: str, user=Depends(get_current_user)):
    book = await db.books.find_one({"id": bid, **dscope(user)})
    if not book:
        raise HTTPException(404, "Buku tidak ditemukan")
    if book.get("ai_summary"):
        return {"summary": book["ai_summary"], "cached": True}
    system = "Anda pustakawan ahli. Jawab ringkas dalam Bahasa Indonesia yang mudah dipahami siswa SMA."
    prompt = (f"Buatkan ringkasan menarik (3-4 kalimat) dan alasan kenapa buku ini layak dibaca siswa SMA.\n"
              f"Judul: {book.get('title')}\nPenulis: {book.get('author') or '-'}\n"
              f"Kategori: {book.get('category') or '-'}\nDeskripsi: {book.get('description') or '(tidak ada)'}")
    text = await _ai_text(system, prompt, f"booksum-{bid}")
    await db.books.update_one({"id": bid}, {"$set": {"ai_summary": text}})
    return {"summary": text, "cached": False}

@api.get("/library/ai-recommendations")
async def ai_recommendations(user=Depends(get_current_user)):
    history = await db.loans.find({"borrower_id": user["id"]}, {"_id": 0, "book_title": 1}).sort("borrowed_at", -1).to_list(15)
    titles = [h["book_title"] for h in history]
    catalog = await db.books.find(dscope(user), {"_id": 0, "title": 1, "author": 1, "category": 1}).to_list(200)
    cat_lines = "\n".join(f"- {b['title']} ({b.get('category') or 'Umum'})" for b in catalog[:80])
    system = "Anda pustakawan yang memberi rekomendasi buku untuk siswa SMA. Jawab dalam Bahasa Indonesia."
    if titles:
        intro = f"Siswa ini pernah meminjam: {', '.join(titles[:8])}."
    else:
        intro = "Siswa ini belum pernah meminjam buku."
    prompt = (f"{intro}\nBerikut katalog yang tersedia:\n{cat_lines}\n\n"
              f"Rekomendasikan 3 buku dari katalog di atas yang paling cocok, "
              f"masing-masing 1 kalimat alasan. Format daftar bernomor.")
    text = await _ai_text(system, prompt, f"librec-{user['id']}")
    return {"recommendations": text, "based_on": titles[:8]}


# ---------------- STARTUP ----------------
@app.on_event("startup")
async def startup():
    async for tx in db.uang_kas.find({"class_id": {"$exists": False}}, {"_id": 0, "id": 1, "kelas": 1, "is_demo": 1}):
        c = await db.classes.find_one({"name": tx.get("kelas"), "is_demo": True if tx.get("is_demo") else {"$ne": True}}, {"id": 1})
        if c:
            await db.uang_kas.update_one({"id": tx["id"]}, {"$set": {"class_id": c["id"]}})
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
    academic_year: Optional[str] = None
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
    login_badge: Optional[str] = None
    login_headline: Optional[str] = None
    login_description: Optional[str] = None
    login_welcome_title: Optional[str] = None
    login_welcome_subtitle: Optional[str] = None
    login_footer: Optional[str] = None
    history_periods: Optional[List[str]] = None
    goals: Optional[List[str]] = None
    environment: Optional[List[str]] = None
    goals_short: Optional[List[str]] = None
    goals_medium: Optional[List[str]] = None
    goals_long: Optional[List[str]] = None
    targets: Optional[List[str]] = None
    principal_education: Optional[str] = None
    principal_major: Optional[str] = None
    principal_sk_date: Optional[str] = None
    principal_training: Optional[str] = None
    nss: Optional[str] = None
    land_area: Optional[str] = None
    sk_pendirian: Optional[str] = None
    sk_instansi: Optional[str] = None
    address_street: Optional[str] = None
    address_village: Optional[str] = None
    address_district: Optional[str] = None
    address_regency: Optional[str] = None
    address_postal: Optional[str] = None
    gallery_images: Optional[List[str]] = None

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
            "name": "Boas Sibarani", "role": "super_admin", "is_demo": False,
            "qr_code": f"SEKOLAHKU-{uid}", "created_at": now_iso(),
        })
        logger.info(f"Super admin seeded: {admin_email}")
    elif existing["role"] != "super_admin":
        await db.users.update_one({"email": admin_email}, {"$set": {"role": "super_admin"}})

    # Remove legacy (non-isolated) demo accounts from earlier versions
    legacy = ["cassandramarsada@gmail.com", "kepsek@sekolahku.id", "tu@sekolahku.id",
              "guru@sekolahku.id", "siswa@sekolahku.id", "ketuaosis@sekolahku.id", "ketuakelas@sekolahku.id"]
    await db.users.delete_many({"email": {"$in": legacy}})


# ---------------- GALERI PRESTASI & KEGIATAN ----------------
class GalleryIn(BaseModel):
    title: str
    description: Optional[str] = ""
    category: str = "Prestasi"  # "Prestasi" | "Kegiatan"
    level: Optional[str] = ""   # e.g. Kabupaten / Provinsi / Nasional
    date: Optional[str] = ""
    image_url: Optional[str] = ""

@api.get("/gallery")
async def list_gallery(category: Optional[str] = None):
    """Public: daftar prestasi & dokumentasi kegiatan untuk halaman publik."""
    q = {"is_demo": {"$ne": True}}
    if category in ("Prestasi", "Kegiatan"):
        q["category"] = category
    items = await db.gallery.find(q, {"_id": 0}).sort("date", -1).to_list(500)
    items.sort(key=lambda x: (x.get("date") or "", x.get("created_at") or ""), reverse=True)
    return items

@api.post("/gallery")
async def add_gallery(body: GalleryIn, user=Depends(require_roles("kepsek", "staff_tu", "ketua_osis"))):
    doc = {"id": str(uuid.uuid4()), **body.model_dump(),
           "created_by": user["name"], "created_at": now_iso()}
    await db.gallery.insert_one(doc); doc.pop("_id", None)
    return doc

@api.patch("/gallery/{gid}")
async def edit_gallery(gid: str, body: GalleryIn, user=Depends(require_roles("kepsek", "staff_tu", "ketua_osis"))):
    r = await db.gallery.update_one({"id": gid}, {"$set": body.model_dump()})
    if r.matched_count == 0:
        raise HTTPException(404, "Item galeri tidak ditemukan")
    return await db.gallery.find_one({"id": gid}, {"_id": 0})

@api.delete("/gallery/{gid}")
async def del_gallery(gid: str, user=Depends(require_roles("kepsek", "staff_tu"))):
    r = await db.gallery.delete_one({"id": gid})
    if r.deleted_count == 0:
        raise HTTPException(404, "Item galeri tidak ditemukan")
    return {"ok": True}

# ---------------- GALERI PRESTASI (Halaman Profil Sekolah — kelola khusus Super Admin) ----------------
class ProfileAchievementIn(BaseModel):
    title: str
    year: Optional[str] = ""
    level: Optional[str] = ""       # Sekolah / Kabupaten / Provinsi / Nasional / Internasional
    description: Optional[str] = ""
    image_url: Optional[str] = ""

@api.get("/profile-achievements")
async def list_profile_achievements():
    """Public: galeri prestasi sekolah untuk halaman Profil Sekolah."""
    items = await db.profile_achievements.find({}, {"_id": 0}).to_list(500)
    items.sort(key=lambda x: (x.get("year") or "", x.get("created_at") or ""), reverse=True)
    return items

@api.post("/profile-achievements")
async def add_profile_achievement(body: ProfileAchievementIn, user=Depends(require_roles("super_admin"))):
    doc = {"id": str(uuid.uuid4()), **body.model_dump(),
           "created_by": user["name"], "created_at": now_iso()}
    await db.profile_achievements.insert_one(doc)
    return strip(doc)

@api.patch("/profile-achievements/{aid}")
async def edit_profile_achievement(aid: str, body: ProfileAchievementIn, user=Depends(require_roles("super_admin"))):
    r = await db.profile_achievements.update_one({"id": aid}, {"$set": body.model_dump()})
    if r.matched_count == 0:
        raise HTTPException(404, "Prestasi tidak ditemukan")
    return await db.profile_achievements.find_one({"id": aid}, {"_id": 0})

@api.delete("/profile-achievements/{aid}")
async def del_profile_achievement(aid: str, user=Depends(require_roles("super_admin"))):
    r = await db.profile_achievements.delete_one({"id": aid})
    if r.deleted_count == 0:
        raise HTTPException(404, "Prestasi tidak ditemukan")
    return {"ok": True}

# ---------------- UNDUH PRESENTASI (.pptx) ----------------
def _build_presentation_pptx(s: dict) -> bytes:
    from pptx import Presentation
    from pptx.util import Inches, Pt, Emu
    from pptx.dml.color import RGBColor
    from pptx.enum.text import PP_ALIGN, MSO_ANCHOR

    SKY = RGBColor(0x02, 0x84, 0xC7)
    SKY_LIGHT = RGBColor(0x38, 0xBD, 0xF8)
    NAVY = RGBColor(0x0F, 0x17, 0x2A)
    SLATE = RGBColor(0x33, 0x41, 0x55)
    WHITE = RGBColor(0xFF, 0xFF, 0xFF)
    MUTED = RGBColor(0xCB, 0xD5, 0xE1)

    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    SW, SH = prs.slide_width, prs.slide_height
    blank = prs.slide_layouts[6]

    school_name = s.get("school_name") or "SEKOLAH"
    school_full = s.get("school_full_name") or school_name

    logo_bytes = None
    _logo_url = (s.get("school_logo_url") or "").strip()
    if _logo_url.startswith("http"):
        try:
            import urllib.request
            _rq = urllib.request.Request(_logo_url, headers={"User-Agent": "Mozilla/5.0"})
            logo_bytes = urllib.request.urlopen(_rq, timeout=8).read()
        except Exception:
            logo_bytes = None

    def bg(slide, color):
        f = slide.background.fill
        f.solid(); f.fore_color.rgb = color

    def rect(slide, x, y, w, h, color):
        from pptx.enum.shapes import MSO_SHAPE
        sp = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, x, y, w, h)
        sp.fill.solid(); sp.fill.fore_color.rgb = color
        sp.line.fill.background()
        sp.shadow.inherit = False
        return sp

    def txt(slide, x, y, w, h, text, size, color, bold=False, align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP, italic=False):
        tb = slide.shapes.add_textbox(x, y, w, h)
        tf = tb.text_frame; tf.word_wrap = True
        tf.vertical_anchor = anchor
        p = tf.paragraphs[0]; p.alignment = align
        r = p.add_run(); r.text = text
        r.font.size = Pt(size); r.font.bold = bold; r.font.italic = italic
        r.font.color.rgb = color; r.font.name = "Calibri"
        return tb

    def bullets(slide, x, y, w, h, items, size=16, color=SLATE, gap=6):
        tb = slide.shapes.add_textbox(x, y, w, h)
        tf = tb.text_frame; tf.word_wrap = True
        for i, it in enumerate(items):
            p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
            p.space_after = Pt(gap)
            rb = p.add_run(); rb.text = "▸  "
            rb.font.size = Pt(size); rb.font.bold = True; rb.font.color.rgb = SKY
            r = p.add_run(); r.text = it
            r.font.size = Pt(size); r.font.color.rgb = color; r.font.name = "Calibri"
        return tb

    def add_logo(slide, left, top, height):
        if not logo_bytes:
            return
        try:
            slide.shapes.add_picture(io.BytesIO(logo_bytes), left, top, height=height)
        except Exception:
            pass

    def feature_slide(title, desc, points, tag="FITUR UTAMA"):
        sl = prs.slides.add_slide(blank)
        bg(sl, WHITE)
        rect(sl, 0, 0, SW, Inches(1.55), SKY)
        rect(sl, 0, Inches(1.55), SW, Emu(45720), NAVY)
        txt(sl, Inches(0.6), Inches(0.28), Inches(10.5), Inches(0.4), tag, 12, SKY_LIGHT, bold=True)
        txt(sl, Inches(0.6), Inches(0.62), Inches(10.6), Inches(0.85), title, 30, WHITE, bold=True)
        add_logo(sl, SW - Inches(1.45), Inches(0.3), Inches(0.95))
        txt(sl, Inches(0.6), Inches(1.85), Inches(12.1), Inches(0.9), desc, 17, SLATE)
        txt(sl, Inches(0.6), Inches(2.95), Inches(6), Inches(0.4), "MANFAAT UTAMA", 13, SKY, bold=True)
        bullets(sl, Inches(0.6), Inches(3.4), Inches(12), Inches(3.4), points, size=17, gap=8)
        rect(sl, 0, SH - Emu(274320), SW, Emu(274320), NAVY)
        txt(sl, Inches(0.6), SH - Emu(274320), Inches(12.1), Emu(274320),
            f"{school_name} · Sistem Manajemen Sekolah Terpadu", 10, MUTED, anchor=MSO_ANCHOR.MIDDLE)
        return sl

    # 1) COVER
    sl = prs.slides.add_slide(blank); bg(sl, NAVY)
    rect(sl, 0, Inches(3.15), SW, Emu(64008), SKY)
    add_logo(sl, int((SW - Inches(1.1)) / 2), Inches(0.55), Inches(1.1))
    txt(sl, Inches(0.8), Inches(1.75), Inches(11.7), Inches(0.5), "SISTEM MANAJEMEN SEKOLAH TERPADU", 16, SKY_LIGHT, bold=True, align=PP_ALIGN.CENTER)
    txt(sl, Inches(0.5), Inches(2.25), Inches(12.3), Inches(1.3), school_full, 44, WHITE, bold=True, align=PP_ALIGN.CENTER)
    txt(sl, Inches(1.5), Inches(3.5), Inches(10.3), Inches(0.7), "Satu Platform · Sembilan Peran · Nol Kertas", 20, MUTED, align=PP_ALIGN.CENTER)
    txt(sl, Inches(1.5), Inches(6.2), Inches(10.3), Inches(0.5),
        f"Tahun Ajaran {s.get('academic_year') or '2026/2027'}", 16, SKY_LIGHT, align=PP_ALIGN.CENTER)

    # 2) RINGKASAN & TUJUAN
    sl = prs.slides.add_slide(blank); bg(sl, WHITE)
    rect(sl, 0, 0, SW, Inches(1.3), SKY)
    txt(sl, Inches(0.6), Inches(0.33), Inches(10.5), Inches(0.7), "Ringkasan Sistem & Tujuan Utama", 30, WHITE, bold=True)
    add_logo(sl, SW - Inches(1.25), Inches(0.2), Inches(0.9))
    txt(sl, Inches(0.6), Inches(1.6), Inches(12.1), Inches(1.0),
        s.get("about") or "Platform terpadu berbasis web untuk mendigitalisasi operasional sekolah agar transparan, cepat, dan mudah diaudit.", 16, SLATE)
    txt(sl, Inches(0.6), Inches(2.75), Inches(12), Inches(0.4), "TUJUAN UTAMA", 13, SKY, bold=True)
    bullets(sl, Inches(0.6), Inches(3.2), Inches(12.1), Inches(3.6), [
        "Presensi harian cepat & akurat lewat QR kartu pelajar dan barcode NISN.",
        "Transparansi keuangan kas kelas dengan pencatatan digital oleh Ketua Kelas & Bendahara.",
        "Struktur kelas/BPH yang rapi, konsisten, dan mudah dikelola.",
        "Aset sekolah selalu terlacak dengan siklus peminjaman yang jelas.",
        "Ujian daring yang jujur melalui sistem anti-cheat.",
        "Satu dasbor terpadu untuk seluruh warga sekolah.",
    ], size=17, gap=8)

    # 3) PERAN PENGGUNA & HAK AKSES
    sl = prs.slides.add_slide(blank); bg(sl, WHITE)
    rect(sl, 0, 0, SW, Inches(1.3), SKY)
    txt(sl, Inches(0.6), Inches(0.33), Inches(10.5), Inches(0.7), "Peran Pengguna & Hak Akses", 30, WHITE, bold=True)
    add_logo(sl, SW - Inches(1.25), Inches(0.2), Inches(0.9))
    roles = [
        ("Super Admin", "Akses penuh seluruh modul, kelola akun & pengaturan sekolah."),
        ("Kepala Sekolah", "Memantau analitik, laporan, dana sosial & pengumuman."),
        ("Staff TU", "Administrasi PPDB, presensi, dan data siswa."),
        ("Guru / Wali Kelas", "Tugas, mini-quiz, ujian, rapor, dan chat wali-ortu."),
        ("Siswa", "Presensi, tugas, quiz, kartu pelajar, dan pengumuman."),
        ("Ketua Kelas", "Mengelola struktur BPH & kas kelas."),
        ("Bendahara", "Mencatat pemasukan/pengeluaran kas kelas."),
        ("Ketua OSIS", "Dana sosial, pemilu OSIS, dan dokumentasi kegiatan."),
        ("Orang Tua", "Memantau rapor & presensi anak, chat dengan wali kelas."),
    ]
    tb = sl.shapes.add_textbox(Inches(0.6), Inches(1.55), Inches(12.1), Inches(5.6))
    tf = tb.text_frame; tf.word_wrap = True
    for i, (role, acc) in enumerate(roles):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.space_after = Pt(7)
        rr = p.add_run(); rr.text = f"{role} — "
        rr.font.size = Pt(16); rr.font.bold = True; rr.font.color.rgb = SKY
        ra = p.add_run(); ra.text = acc
        ra.font.size = Pt(16); ra.font.color.rgb = SLATE

    # 4-8) FITUR UTAMA
    feature_slide("Absensi QR / Barcode",
        "Presensi harian 800 siswa tanpa antre menggunakan QR kartu pelajar atau barcode scanner NISN.",
        ["±73% lebih cepat dibanding presensi manual.",
         "Anti-duplikat: satu siswa tercatat sekali per hari.",
         "Metode manual tersedia sebagai cadangan dalam satu log.",
         "Notifikasi kehadiran otomatis ke siswa & orang tua.",
         "Rekap & ekspor Excel lengkap dengan kolom metode."])
    feature_slide("Kas Kelas",
        "Pencatatan keuangan kas kelas yang transparan, dikelola Ketua Kelas & Bendahara.",
        ["Rekap mingguan per siswa + tombol 'Tandai Bayar'.",
         "Grafik tren kas 3–12 bulan & rekap bulanan.",
         "Pengingat otomatis tiap Jumat 08:00 WIB ke penunggak.",
         "Setiap rupiah tercatat atas nama pembayar.",
         "Anggota lain baca-saja — transparansi penuh."])
    feature_slide("Manajemen Kelas & Struktur BPH",
        "Bagan pengurus kelas berjenjang dengan foto, garis penghubung, dan drag-and-drop.",
        ["Salin struktur BPH antar kelas dalam sekejap.",
         "Password kelas sekali input untuk seluruh anggota.",
         "Siswa sekelas otomatis menjadi anggota.",
         "Kedalaman jabatan tak terbatas.",
         "Hanya Ketua Kelas yang dapat mengubah struktur."])
    feature_slide("Inventaris & Peminjaman",
        "Pengelolaan aset sekolah yang selalu terlacak dengan siklus peminjaman penuh.",
        ["Data lengkap: kode, kategori, lokasi, kondisi, stok.",
         "Peringatan stok menipis otomatis.",
         "Siklus ajukan → setujui/tolak → dikembalikan.",
         "Notifikasi status ke pemohon.",
         "Ekspor laporan Excel (tersedia, dipinjam, total)."])
    feature_slide("Ujian Online Anti-Cheat",
        "Ujian daring yang jujur dengan penguncian layar dan pencatatan pelanggaran di server.",
        ["Password wajib; ujian mulai otomatis.",
         "Mode layar penuh dipaksa selama pengerjaan.",
         "Pindah tab/keluar fullscreen tercatat sebagai pelanggaran.",
         "Batas pelanggaran → jawaban terkirim & ujian terkunci.",
         "Soal & opsi diacak per siswa; timer live opsional."])

    # 9) MODUL PENDUKUNG
    sl = prs.slides.add_slide(blank); bg(sl, WHITE)
    rect(sl, 0, 0, SW, Inches(1.3), SKY)
    txt(sl, Inches(0.6), Inches(0.33), Inches(10.5), Inches(0.7), "Modul Pendukung", 30, WHITE, bold=True)
    add_logo(sl, SW - Inches(1.25), Inches(0.2), Inches(0.9))
    bullets(sl, Inches(0.6), Inches(1.7), Inches(12.1), Inches(5.3), [
        "Tugas & Mini-Quiz — penilaian otomatis, soal diacak, quiz bulanan terjadwal.",
        "PPDB Online — pendaftaran siswa baru tanpa akun, upload berkas, pantau status 24/7.",
        "Kartu Pelajar Digital — QR permanen, cetak massal format KTP ter-branding sekolah.",
        "Dana Sosial — penggalangan & pencatatan bantuan sosial yang transparan.",
        "Pemilu OSIS — pemungutan suara digital yang aman dan real-time.",
        "Schoolgram — galeri momen & kegiatan sekolah.",
        "Kalender, Pengumuman, Rapor Digital, Chat Wali-Ortu, dan Papan Prestasi.",
    ], size=17, gap=9)

    # 10) PENUTUP
    sl = prs.slides.add_slide(blank); bg(sl, NAVY)
    rect(sl, 0, Inches(3.2), SW, Emu(64008), SKY)
    add_logo(sl, int((SW - Inches(0.95)) / 2), Inches(0.7), Inches(0.95))
    txt(sl, Inches(1), Inches(2.1), Inches(11.3), Inches(1.1), "Sekolah Lebih Rapi, Mulai Hari Ini.", 38, WHITE, bold=True, align=PP_ALIGN.CENTER)
    txt(sl, Inches(1.5), Inches(3.5), Inches(10.3), Inches(1.2),
        "Presensi dalam hitungan menit · Kas transparan · Aset terlacak · Ujian jujur.", 18, MUTED, align=PP_ALIGN.CENTER)
    txt(sl, Inches(1), Inches(6.3), Inches(11.3), Inches(0.5), school_full, 16, SKY_LIGHT, bold=True, align=PP_ALIGN.CENTER)

    buf = io.BytesIO(); prs.save(buf); buf.seek(0)
    return buf.getvalue()

@api.get("/presentation/pptx")
async def download_presentation_pptx():
    """Public: unduh deck presentasi dalam format PowerPoint (.pptx)."""
    s = await get_settings()
    data = _build_presentation_pptx(s)
    name = (s.get("school_name") or "Sekolah").replace(" ", "_")
    headers = {"Content-Disposition": f'attachment; filename="Presentasi_{name}.pptx"'}
    return StreamingResponse(io.BytesIO(data),
        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        headers=headers)


# ==================== JADWAL PELAJARAN (TIMETABLE) ====================
DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"]

def _tmin(t: str) -> int:
    try:
        h, m = str(t).split(":")
        return int(h) * 60 + int(m)
    except Exception:
        return -1

class TimetableIn(BaseModel):
    class_id: str
    day: str
    start_time: str
    end_time: str
    subject: str
    teacher_id: Optional[str] = None
    room: Optional[str] = ""

class TimetableUpdate(BaseModel):
    day: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    subject: Optional[str] = None
    teacher_id: Optional[str] = None
    room: Optional[str] = None

async def _timetable_conflict(day, start, end, class_id, teacher_id, room, exclude_id=None):
    s, e = _tmin(start), _tmin(end)
    async for it in db.timetable.find({"day": day}):
        if exclude_id and it.get("id") == exclude_id:
            continue
        s2, e2 = _tmin(it.get("start_time")), _tmin(it.get("end_time"))
        if not (s < e2 and s2 < e):
            continue
        if it.get("class_id") == class_id:
            return f"Bentrok dengan jadwal kelas {it.get('subject')} ({it['start_time']}-{it['end_time']})"
        if teacher_id and it.get("teacher_id") == teacher_id:
            return f"Guru sudah mengajar {it.get('subject')} pada {day} {it['start_time']}-{it['end_time']}"
        if room and it.get("room") == room:
            return f"Ruangan {room} dipakai untuk {it.get('subject')} ({it['start_time']}-{it['end_time']})"
    return None

def _sorted_tt(items):
    order = {d: i for i, d in enumerate(DAYS)}
    items.sort(key=lambda x: (order.get(x.get("day"), 9), _tmin(x.get("start_time", ""))))
    return items

@api.get("/timetable")
async def list_timetable(class_id: Optional[str] = None, user=Depends(get_current_user)):
    role = user.get("role")
    q = {}
    if class_id:
        q["class_id"] = class_id
    elif role == "guru":
        q["teacher_id"] = user["id"]
    elif role in ("siswa", "ketua_kelas", "ketua_osis") and user.get("kelas"):
        c = await db.classes.find_one({"name": user["kelas"]})
        q["class_id"] = c["id"] if c else "__none__"
    items = await db.timetable.find(q, {"_id": 0}).to_list(2000)
    return _sorted_tt(items)

@api.get("/timetable/today")
async def timetable_today(user=Depends(get_current_user)):
    now_wib = datetime.now(timezone.utc) + timedelta(hours=7)
    idx = now_wib.weekday()
    if idx > 5:
        return {"day": "Minggu", "items": []}
    day = DAYS[idx]
    role = user.get("role")
    q = {"day": day}
    if role == "guru":
        q["teacher_id"] = user["id"]
    elif role in ("siswa", "ketua_kelas", "ketua_osis") and user.get("kelas"):
        c = await db.classes.find_one({"name": user["kelas"]})
        q["class_id"] = c["id"] if c else "__none__"
    items = await db.timetable.find(q, {"_id": 0}).to_list(200)
    items.sort(key=lambda x: _tmin(x.get("start_time", "")))
    return {"day": day, "items": items}

@api.post("/timetable")
async def create_timetable(body: TimetableIn, user=Depends(require_roles("super_admin", "guru", "kepsek", "staff_tu"))):
    if body.day not in DAYS:
        raise HTTPException(400, "Hari tidak valid")
    if _tmin(body.start_time) < 0 or _tmin(body.start_time) >= _tmin(body.end_time):
        raise HTTPException(400, "Waktu mulai/selesai tidak valid")
    c = await db.classes.find_one({"id": body.class_id})
    if not c:
        raise HTTPException(404, "Kelas tidak ditemukan")
    conflict = await _timetable_conflict(body.day, body.start_time, body.end_time, body.class_id, body.teacher_id, body.room)
    if conflict:
        raise HTTPException(409, conflict)
    tname = None
    if body.teacher_id:
        t = await db.users.find_one({"id": body.teacher_id})
        tname = t["name"] if t else None
    doc = {"id": str(uuid.uuid4()), "class_id": body.class_id, "class_name": c["name"], "day": body.day,
           "start_time": body.start_time, "end_time": body.end_time, "subject": body.subject,
           "teacher_id": body.teacher_id, "teacher_name": tname, "room": body.room or "", "created_at": now_iso()}
    await db.timetable.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.patch("/timetable/{tid}")
async def update_timetable(tid: str, body: TimetableUpdate, user=Depends(require_roles("super_admin", "guru", "kepsek", "staff_tu"))):
    cur = await db.timetable.find_one({"id": tid})
    if not cur:
        raise HTTPException(404, "Jadwal tidak ditemukan")
    upd = {k: v for k, v in body.model_dump().items() if v is not None}
    merged = {**cur, **upd}
    if merged["day"] not in DAYS:
        raise HTTPException(400, "Hari tidak valid")
    if _tmin(merged["start_time"]) < 0 or _tmin(merged["start_time"]) >= _tmin(merged["end_time"]):
        raise HTTPException(400, "Waktu mulai/selesai tidak valid")
    conflict = await _timetable_conflict(merged["day"], merged["start_time"], merged["end_time"],
                                         merged["class_id"], merged.get("teacher_id"), merged.get("room"), exclude_id=tid)
    if conflict:
        raise HTTPException(409, conflict)
    if "teacher_id" in upd:
        t = await db.users.find_one({"id": upd["teacher_id"]}) if upd["teacher_id"] else None
        upd["teacher_name"] = t["name"] if t else None
    await db.timetable.update_one({"id": tid}, {"$set": upd})
    doc = await db.timetable.find_one({"id": tid}, {"_id": 0})
    return doc

@api.delete("/timetable/{tid}")
async def delete_timetable(tid: str, user=Depends(require_roles("super_admin", "guru", "kepsek", "staff_tu"))):
    await db.timetable.delete_one({"id": tid})
    return {"ok": True}

# ==================== GAMIFIKASI POIN SISWA ====================
POINT_CATS = ["prestasi", "kedisiplinan", "akademik", "lainnya"]

class PointIn(BaseModel):
    user_id: str
    points: int
    reason: str
    category: str = "prestasi"

@api.post("/points")
async def award_points(body: PointIn, user=Depends(require_roles("super_admin", "guru", "kepsek", "ketua_osis", "staff_tu"))):
    target = await db.users.find_one({"id": body.user_id})
    if not target:
        raise HTTPException(404, "Siswa tidak ditemukan")
    if not str(body.reason).strip():
        raise HTTPException(400, "Alasan wajib diisi")
    doc = {"id": str(uuid.uuid4()), "user_id": body.user_id, "user_name": target.get("name"),
           "kelas": target.get("kelas", ""), "points": int(body.points), "reason": body.reason,
           "category": body.category if body.category in POINT_CATS else "lainnya",
           "awarded_by": user["name"], "created_at": now_iso()}
    await db.points.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.get("/points/me")
async def my_points(user=Depends(get_current_user)):
    rows = await db.points.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return {"total": sum(r["points"] for r in rows), "history": rows}

@api.get("/points/leaderboard")
async def points_leaderboard(user=Depends(get_current_user)):
    spipe = [{"$group": {"_id": "$user_id", "name": {"$last": "$user_name"}, "kelas": {"$last": "$kelas"}, "total": {"$sum": "$points"}}},
             {"$sort": {"total": -1}}, {"$limit": 50}]
    students = [{"user_id": r["_id"], "name": r.get("name"), "kelas": r.get("kelas", ""), "total": r["total"]}
                async for r in db.points.aggregate(spipe)]
    cpipe = [{"$group": {"_id": "$kelas", "total": {"$sum": "$points"}}}, {"$sort": {"total": -1}}, {"$limit": 30}]
    classes = [{"kelas": (r["_id"] or "—"), "total": r["total"]} async for r in db.points.aggregate(cpipe)]
    return {"students": students, "classes": classes}

@api.get("/points/history/{uid}")
async def points_history(uid: str, user=Depends(get_current_user)):
    if uid != user["id"] and user.get("role") not in ("super_admin", "guru", "kepsek", "ketua_osis", "staff_tu"):
        raise HTTPException(403, "Forbidden")
    rows = await db.points.find({"user_id": uid}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return {"total": sum(r["points"] for r in rows), "history": rows}


# ==================== SCHOOLGRAM PER-KELAS (Instagram-style) ====================
def can_manage_schoolgram(user: dict, klass: dict) -> bool:
    if user.get("role") == "super_admin":
        return True
    if user.get("role") == "ketua_kelas" and user.get("kelas") == klass.get("name"):
        return True
    return False

async def _story_cleanup():
    await db.stories.delete_many({"highlighted": {"$ne": True}, "expires_at": {"$lt": now_iso()}})

@api.get("/schoolgram/classes")
async def schoolgram_classes(user=Depends(get_current_user)):
    await _story_cleanup()
    classes = await db.classes.find(dscope(user), {"_id": 0}).to_list(500)
    now = now_iso()
    out = []
    for c in classes:
        latest = await db.posts.find({"class_id": c["id"]}, {"_id": 0, "image": 1}).sort("created_at", -1).to_list(1)
        out.append({
            "id": c["id"], "name": c["name"],
            "post_count": await db.posts.count_documents({"class_id": c["id"]}),
            "student_count": await db.users.count_documents({"role": {"$in": ["siswa", "ketua_kelas"]}, "kelas": c["name"], **dscope(user)}),
            "cover": (latest[0]["image"] if latest else None),
            "has_story": (await db.stories.count_documents({"class_id": c["id"], "$or": [{"highlighted": True}, {"expires_at": {"$gte": now}}]})) > 0,
            "can_manage": can_manage_schoolgram(user, c),
        })
    out.sort(key=lambda x: x["name"])
    return out

@api.get("/schoolgram/class/{cid}")
async def schoolgram_class(cid: str, user=Depends(get_current_user)):
    await _story_cleanup()
    c = await db.classes.find_one({"id": cid}, {"_id": 0})
    if not c:
        raise HTTPException(404, "Kelas tidak ditemukan")
    posts = await db.posts.find({"class_id": cid}, {"_id": 0}).sort("created_at", -1).to_list(200)
    for p in posts:
        p["like_count"] = len(p.get("likes", []))
        p["liked"] = user["id"] in p.get("likes", [])
    now = now_iso()
    return {
        "class": {"id": c["id"], "name": c["name"], "description": c.get("description", "")},
        "posts": posts,
        "stories": await db.stories.find({"class_id": cid, "expires_at": {"$gte": now}}, {"_id": 0}).sort("created_at", -1).to_list(100),
        "highlights": await db.stories.find({"class_id": cid, "highlighted": True}, {"_id": 0}).sort("created_at", -1).to_list(100),
        "can_manage": can_manage_schoolgram(user, c),
        "student_count": await db.users.count_documents({"role": {"$in": ["siswa", "ketua_kelas"]}, "kelas": c["name"], **dscope(user)}),
    }

async def _assert_manage(cid, user):
    c = await db.classes.find_one({"id": cid})
    if not c:
        raise HTTPException(404, "Kelas tidak ditemukan")
    if not can_manage_schoolgram(user, c):
        raise HTTPException(403, "Hanya Ketua Kelas (atau Super Admin) yang dapat mengelola Schoolgram kelas ini")
    return c

class SgPostIn(BaseModel):
    image: str
    caption: Optional[str] = ""

@api.post("/schoolgram/class/{cid}/post")
async def sg_create_post(cid: str, body: SgPostIn, user=Depends(get_current_user)):
    c = await _assert_manage(cid, user)
    doc = {"id": str(uuid.uuid4()), "image": body.image, "caption": body.caption or "",
           "author_id": user["id"], "author_name": user["name"], "author_role": user["role"],
           "class_id": cid, "kelas": c["name"], "likes": [], "comments": [], "created_at": now_iso(),
           "is_demo": bool(user.get("is_demo"))}
    await db.posts.insert_one(doc)
    doc.pop("_id", None)
    return doc

class SgPostUpdate(BaseModel):
    caption: str

@api.patch("/schoolgram/post/{pid}")
async def sg_edit_post(pid: str, body: SgPostUpdate, user=Depends(get_current_user)):
    p = await db.posts.find_one({"id": pid})
    if not p:
        raise HTTPException(404, "Post tidak ditemukan")
    await _assert_manage(p.get("class_id"), user)
    await db.posts.update_one({"id": pid}, {"$set": {"caption": body.caption}})
    return {"ok": True}

@api.delete("/schoolgram/post/{pid}")
async def sg_delete_post(pid: str, user=Depends(get_current_user)):
    p = await db.posts.find_one({"id": pid})
    if not p:
        raise HTTPException(404, "Post tidak ditemukan")
    await _assert_manage(p.get("class_id"), user)
    await db.posts.delete_one({"id": pid})
    return {"ok": True}

class SgStoryIn(BaseModel):
    image: str
    caption: Optional[str] = ""

@api.post("/schoolgram/class/{cid}/story")
async def sg_create_story(cid: str, body: SgStoryIn, user=Depends(get_current_user)):
    c = await _assert_manage(cid, user)
    created = datetime.now(timezone.utc)
    doc = {"id": str(uuid.uuid4()), "class_id": cid, "class_name": c["name"], "image": body.image,
           "caption": body.caption or "", "author_id": user["id"], "author_name": user["name"],
           "highlighted": False, "highlight_title": "", "created_at": created.isoformat(),
           "expires_at": (created + timedelta(hours=24)).isoformat()}
    await db.stories.insert_one(doc)
    doc.pop("_id", None)
    return doc

class HighlightIn(BaseModel):
    highlighted: bool
    title: Optional[str] = ""

@api.post("/schoolgram/story/{sid}/highlight")
async def sg_highlight(sid: str, body: HighlightIn, user=Depends(get_current_user)):
    s = await db.stories.find_one({"id": sid})
    if not s:
        raise HTTPException(404, "Story tidak ditemukan")
    await _assert_manage(s.get("class_id"), user)
    await db.stories.update_one({"id": sid}, {"$set": {"highlighted": body.highlighted, "highlight_title": body.title or "Sorotan"}})
    return {"ok": True}

@api.delete("/schoolgram/story/{sid}")
async def sg_delete_story(sid: str, user=Depends(get_current_user)):
    s = await db.stories.find_one({"id": sid})
    if not s:
        raise HTTPException(404, "Story tidak ditemukan")
    await _assert_manage(s.get("class_id"), user)
    await db.stories.delete_one({"id": sid})
    return {"ok": True}

# ==================== ASISTEN AI ====================
import json as _json

class AiChatIn(BaseModel):
    message: str
    history: Optional[List[dict]] = None

@api.post("/ai/chat")
async def ai_chat(body: AiChatIn, user=Depends(get_current_user)):
    s = await get_settings()
    system = (f"Anda adalah Asisten AI untuk {s.get('school_name', 'sekolah')}. "
              "Bantu warga sekolah (siswa, guru, staf) dengan ramah dalam Bahasa Indonesia. "
              "Jawab ringkas, jelas, dan sopan.")
    ctx = ""
    for h in (body.history or [])[-6:]:
        who = "Pengguna" if h.get("role") == "user" else "Asisten"
        ctx += f"{who}: {h.get('content', '')}\n"
    reply = await _ai_text(system, f"{ctx}Pengguna: {body.message}\nAsisten:", f"aichat-{user['id']}")
    return {"reply": reply}

class AiQuizIn(BaseModel):
    topic: str
    count: int = 5
    kelas: Optional[str] = ""

@api.post("/ai/quiz-generate")
async def ai_quiz_generate(body: AiQuizIn, user=Depends(require_roles("guru", "super_admin", "kepsek"))):
    n = max(1, min(int(body.count or 5), 15))
    system = "Anda pembuat soal pilihan ganda untuk siswa SMA Indonesia. Keluarkan HANYA JSON valid tanpa teks lain."
    prompt = (f"Buat {n} soal pilihan ganda tentang '{body.topic}'"
              + (f" untuk kelas {body.kelas}" if body.kelas else "") + ". "
              'Format JSON: array objek {"q": string, "options": [4 string], "answer": index_benar_0_sampai_3}. '
              "Tepat 4 opsi dan 'answer' integer 0-3. Hanya JSON.")
    raw = (await _ai_text(system, prompt, f"aiquiz-{user['id']}")).strip()
    if "```" in raw:
        raw = raw.split("```")[1]
        if raw.lower().startswith("json"):
            raw = raw[4:]
    a, b = raw.find("["), raw.rfind("]")
    if a != -1 and b != -1:
        raw = raw[a:b + 1]
    try:
        qs = _json.loads(raw)
    except Exception:
        raise HTTPException(502, "AI gagal menghasilkan soal yang valid, coba lagi")
    clean = []
    for q in qs:
        opts = q.get("options") or []
        if not q.get("q") or len(opts) < 2:
            continue
        opts = ([str(o) for o in opts] + ["", "", "", ""])[:4]
        try:
            ans = int(q.get("answer", 0))
        except Exception:
            ans = 0
        clean.append({"q": str(q["q"]), "options": opts, "answer": max(0, min(ans, 3))})
    if not clean:
        raise HTTPException(502, "AI tidak menghasilkan soal, coba lagi")
    return {"questions": clean}

class AiSummarizeIn(BaseModel):
    text: str

@api.post("/ai/summarize")
async def ai_summarize(body: AiSummarizeIn, user=Depends(require_roles("guru", "super_admin", "kepsek", "staff_tu", "ketua_osis"))):
    if not body.text.strip():
        raise HTTPException(400, "Teks kosong")
    system = "Anda meringkas teks sekolah menjadi poin-poin penting dalam Bahasa Indonesia yang jelas dan singkat."
    summary = await _ai_text(system, f"Ringkas teks berikut menjadi 3-5 poin (gunakan '- '):\n\n{body.text}", f"aisum-{user['id']}")
    return {"summary": summary}


app.include_router(api)

@app.on_event("shutdown")
async def shutdown():
    client.close()
