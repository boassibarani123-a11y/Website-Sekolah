# ERD — Entity Relationship Diagram (MongoDB)

MongoDB tidak memakai foreign key; relasi di bawah adalah relasi logis lewat field `*_id` (UUID string) dan
`kelas` (nama kelas pada akun siswa). Diagram dibuat dari source code (`server.py`, `live_class.py`).

## 1. Inti: Pengguna, Kelas, Jadwal, Kelas Live
```mermaid
erDiagram
    USERS ||--o{ CLASSES : "wali kelas (homeroom_teacher_id)"
    CLASSES ||--o{ USERS : "siswa (users.kelas = classes.name)"
    CLASSES ||--o{ TIMETABLE : "class_id"
    USERS ||--o{ TIMETABLE : "teacher_id"
    TIMETABLE ||--o{ LIVE_SESSIONS : "timetable_id"
    CLASSES ||--o{ LIVE_SESSIONS : "class_id"
    LIVE_SESSIONS ||--o{ LIVE_ATTENDANCE : "session_id"
    USERS ||--o{ LIVE_ATTENDANCE : "student_id"
    LIVE_SESSIONS ||--o{ LIVE_CHAT : "session_id"
    LIVE_SESSIONS ||--o{ LIVE_EVENTS : "session_id"

    USERS { string id PK
            string email UK
            string name
            string role
            string kelas
            string nis
            int token_version }
    CLASSES { string id PK
              string name UK
              string homeroom_teacher_id FK
              string live_mode "follow|on|off" }
    TIMETABLE { string id PK
                string class_id FK
                string teacher_id FK
                string day "Senin..Sabtu"
                string start_time
                string end_time
                string subject }
    LIVE_SESSIONS { string id PK
                    string room UK
                    string class_id FK
                    string timetable_id FK
                    string teacher_id FK
                    string start_at
                    string ends_at
                    string status "active|ended"
                    bool locked
                    int extended_minutes
                    string teacher_joined_at
                    array joined
                    array kicked }
    LIVE_ATTENDANCE { string id PK
                      string session_id FK
                      string student_id FK
                      string date
                      string status "hadir"
                      int seconds }
    LIVE_CHAT { string id PK
                string session_id FK
                string user_id FK
                string text
                bool announcement }
    LIVE_EVENTS { string id PK
                  string session_id FK
                  string type
                  string at }
```
`live_settings` (dokumen tunggal `id="global"`, field `enabled`) mengatur buka/tutup seluruh sekolah.

## 2. Absensi
```mermaid
erDiagram
    USERS ||--o{ ATTENDANCE : "student_id"
    USERS ||--o{ TEACHER_ATTENDANCE : "teacher_id"
    USERS ||--o{ IK_REQUESTS : "student_id / teacher_id"
    USERS ||--o{ GATE_LOGS : "student_id / user_id"
    IK_REQUESTS ||--o{ GATE_LOGS : "izin_id"
    USERS ||--o| FACE_PROFILES : "user_id"
    ATTENDANCE { string id PK
                 string student_id FK
                 string date
                 string status
                 string method }
    TEACHER_ATTENDANCE { string id PK
                         string teacher_id FK
                         string date
                         string status }
```
Pendukung: `attendance_stations`, `attendance_archives`, `attendance_confirm_tokens`, `gate_settings`, `piket_shifts (teacher_id)`, `guests`, `guest_hours`.

## 3. Pembelajaran & Ujian
```mermaid
erDiagram
    CLASSES ||--o{ ASSIGNMENTS : "class_id"
    USERS ||--o{ ASSIGNMENTS : "teacher_id"
    ASSIGNMENTS ||--o{ SUBMISSIONS : "assignment_id"
    USERS ||--o{ SUBMISSIONS : "student_id"
    USERS ||--o{ EXAMS : "teacher_id"
    EXAMS ||--o{ EXAM_SESSIONS : "exam_id"
    EXAMS ||--o{ EXAM_ATTEMPTS : "exam_id"
    USERS ||--o{ EXAM_ATTEMPTS : "student_id"
    USERS ||--o{ EXAM_REQUESTS : "teacher_id"
    USERS ||--o{ QUESTION_BANK : "teacher_id"
    USERS ||--o{ QUIZZES : "teacher_id"
    QUIZZES ||--o{ QUIZ_ATTEMPTS : "quiz_id"
    CLASSES ||--o{ CLASS_MATERIALS : "class_id"
    CLASS_MATERIALS ||--o{ MATERIAL_VIEWS : "material_id"
```
Pendukung kelas: `class_schedule`, `class_agenda`, `class_announcements`, `class_seating`, `class_discussions`, `class_bph`, `report_notes`, `points`, `subjects`.

## 4. Administrasi & Sosial
```mermaid
erDiagram
    BOOKS ||--o{ LOANS : "book_id"
    USERS ||--o{ LOANS : "borrower_id"
    BOOKS ||--o{ BOOK_REVIEWS : "book_id"
    BOOKS ||--o{ RESERVATIONS : "book_id"
    INVENTORY_ROOMS ||--o{ INVENTORY : "room"
    INVENTORY ||--o{ BORROW_REQUESTS : "item_id"
    INVENTORY ||--o{ INVENTORY_LOGS : "item_id"
    CLASSES ||--o{ UANG_KAS : "class_id"
    USERS ||--o{ UANG_KAS : "student_id / treasurer_id"
    CANDIDATES ||--o{ VOTES : "candidate_id"
    USERS ||--o{ VOTES : "student_id"
    USERS ||--o{ POSTS : "author_id"
    USERS ||--o{ STORIES : "author_id"
    USERS ||--o{ SG_FOLLOWS : "follower/following"
    USERS ||--o{ PPDB : "owner_id"
```
Lainnya: `announcements`, `notifications`, `events`, `feedback`, `gallery`, `files` (metadata unggahan di disk), `org_structures`, `org_nodes`, `settings`, `library_config`, `election_config`, `social_fund`, `chat_messages`, `email_logs`, `cron_runs`, `audit_logs`, `login_attempts`, `password_reset_requests`, `password_reset_tokens`, `reset_requests`, `reschedules`, `profile_achievements`.
