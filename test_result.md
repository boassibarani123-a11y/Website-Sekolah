#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: "Penyelesaian Website-Sekolah main23: Import Siswa Massal (NIS 5 angka), Paket Soal Acak per kesukaran, Layar Piket TV, Email Brevo (reset password token + notifikasi, belum dikonfigurasi), AI soal (Claude Sonnet 4.5 via Emergent key)"

backend:
  - task: "Import Siswa Massal (POST /api/admin/students/import + /preview + /template; alias /api/users/import*)"
    implemented: true
    working: "NA"
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        - working: "NA"
          agent: "main"
          comment: "NIS wajib tepat 5 angka; baris invalid/duplikat dilaporkan tanpa menggagalkan batch; insert_many per 500; notify_email=1 kirim email akun bila email aktif"
  - task: "Paket Soal Acak (POST /api/exams/random-package, GET /api/question-bank/stock)"
    implemented: true
    working: "NA"
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        - working: "NA"
          agent: "main"
          comment: "$sample per difficulty_label (Mudah/Sedang/Sukar), exclude_poor lewati daya beda Jelek, stok kurang -> warnings (bukan error)"
  - task: "Layar Piket TV (GET /api/piket/tv)"
    implemented: true
    working: "NA"
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Status gerbang (fase masuk/pelajaran/pulang), counts, piket hari ini, 7 hari ke depan, 8 aktivitas terakhir"
  - task: "Email Brevo + reset password token (GET /api/auth/reset-options, POST /api/auth/forgot-password/email, POST /api/auth/reset-password, GET /api/email/status)"
    implemented: true
    working: "NA"
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        - working: "NA"
          agent: "main"
          comment: "BREVO_API_KEY kosong -> configured false tanpa error; token sha256 sekali pakai 30 mnt; retry 429/5xx; email_logs; notifikasi jadwal ujian saat create exam"
  - task: "AI pembuat soal (GET /api/ai/status, POST /api/ai/exam-generate)"
    implemented: true
    working: "NA"
    file: "backend/server.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: true
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Claude claude-sonnet-4-5-20250929 via EMERGENT_LLM_KEY"

frontend:
  - task: "ImportStudentsModal (aturan NIS, checkbox email), ExamEditor Paket Soal Acak + Buat dengan AI, /piket/tv, ForgotPassword mode email, /reset-password"
    implemented: true
    working: "NA"
    file: "frontend/src/components/vortex/RandomPackageModal.jsx, AiExamModal.jsx, pages/PiketTV.jsx, pages/ResetPassword.jsx, pages/ForgotPassword.jsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Implemented"

metadata:
  created_by: "main_agent"
  version: "1.0"
  test_sequence: 55
  run_ui: true

test_plan:
  current_focus:
    - "Import Siswa Massal"
    - "Paket Soal Acak"
    - "Layar Piket TV"
    - "Email Brevo + reset password token"
    - "AI pembuat soal"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
    - agent: "main"
      message: "Fitur 1-5 diimplementasikan. Kredensial di /app/memory/test_credentials.md. Seed: python /app/scripts/seed_test_data.py"
