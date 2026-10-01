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

- Iter 4:
  - Class lock is now enforced on the server for tugas/quiz. List endpoints filter out items from locked classes. Submit, submission status, quiz attempt and quiz unlock return 423.
  - Quiz password: the guru who created the quiz, or super_admin, can set, change or remove it. Students unlock it once (stored in users.unlocked_quizzes). Locked quizzes are returned without their questions.
  - Weekly kas billing: GET /api/classes/{cid}/kas/weekly, for ketua_kelas and super_admin, with a Monday–Sunday WIB week. The "Tandai Bayar" button records a masuk transaction with student_id. Optional "Dari siswa" select in the kas form.

- Iter 5:
  - Monthly kas recap: GET /api/classes/{cid}/kas/monthly?month=YYYY-MM. Uses Mon–Sun WIB weeks that overlap the month. Table shows each student's status per week (paid / unpaid / future).
  - Quiz time limit (time_limit in minutes): POST /api/quizzes/{id}/start creates a server-side session. Timer counts down and answers auto-submit at 0. Attempts are rejected after the deadline + 20s.
  - Super admin can remove a class password (remove_password).
  - Friday 08:00 WIB cron (.emergent/crons.yml) calls POST /api/cron/kas-reminder (Bearer WEBHOOK_CRON_SECRET, idempotent via cron_runs). It sends an in-app notification to unpaid students in classes that use weekly billing.

- Iter 6:
  - Quiz shuffle: per-student shuffled question and option order, stored in quiz_sessions. POST /api/quizzes/{id}/start returns the shuffled quiz; attempt maps answers back. Editing questions or the time limit resets sessions.
  - Kas chart: GET /api/classes/{cid}/kas/chart?months=N (3–12, WIB months) and a recharts bar chart in the kas tab for every class viewer.

## Backlog
