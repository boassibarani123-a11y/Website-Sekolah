# SEKOLAHKU — PRD

## Original problem
Import project from GitHub (boassibarani123-a11y/Website-Sekolah, branch main2) and install dependencies. Later iterations add school features (Indonesian UI).

## Architecture
React (CRA + craco, Tailwind, shadcn) + FastAPI + MongoDB. Emergent object storage, Emergent LLM key, Emergent managed email (Resend).
Note: the repo's babel plugin crashes on recursive JSX. Use React.createElement for recursion.

## Implemented
- Iter 1: Imported repo, installed dependencies, set up env.
- Iter 2: Password reset email (Emergent managed email + email_guard.py). Login announcement banner (show_on_login). OrgTree with connector lines, unlimited depth and "Lapis" layer labels.
- Iter 3:
  - Public page /struktur-organisasi showing all structures as tabs, with a link from the login page.
  - Dana Sosial edit/delete (PATCH/DELETE /api/social-fund/{id}).
  - Class password: only super_admin sets it. Members enter it once (stored in users.unlocked_classes). Changing the password resets all unlocks.
  - Uang Kas moved into a "Uang Kas" tab inside each class (/api/classes/{cid}/kas). Only the ketua_kelas of that class can add, edit or delete; everyone else is read-only. The old /uang-kas page and menu were removed.
  - Attendance: USB barcode (keyboard-wedge, NISN) card below the QR card. One shared log, with a method badge (QR / Barcode / Manual) and a Metode column in Excel.

## Backlog
- P1: Option to remove a class password (currently it can only be set or changed).
- P2: Enforce class lock on the tugas/quiz API endpoints. Currently it is only enforced on the kas endpoints and by the frontend.
