#!/usr/bin/env python3
"""
Backend Test Suite for SEKOLAHKU Class Enhancement Features
Tests subjects CRUD, guru subject-based access, student isolation, 
assignment permissions, submission warehouse, and reschedule notices.
"""

import requests
import random
import string
import sys
from typing import Dict, List, Optional

# Configuration
BASE_URL = "https://a11y-school-build.preview.emergentagent.com/api"
SUPER_ADMIN_EMAIL = "boassibarani123@gmail.com"
SUPER_ADMIN_PASSWORD = "Boas12345io"

# Test data tracking for cleanup
created_users: List[str] = []
created_classes: List[str] = []
created_subjects: List[str] = []
created_assignments: List[str] = []
created_reschedules: List[str] = []

# Test results
test_results = []

def random_suffix():
    """Generate random suffix for unique test data"""
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))

def log_result(scenario: str, test: str, passed: bool, details: str = ""):
    """Log test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    result = f"{status} | {scenario} | {test}"
    if details:
        result += f" | {details}"
    test_results.append((passed, result))
    print(result)

def login(email: str, password: str) -> Optional[Dict]:
    """Login and return token + user"""
    try:
        resp = requests.post(f"{BASE_URL}/auth/login", 
                           json={"email": email, "password": password},
                           timeout=30)
        if resp.status_code == 200:
            data = resp.json()
            return {"token": data["token"], "user": data["user"]}
        return None
    except Exception as e:
        print(f"Login error: {e}")
        return None

def make_request(method: str, endpoint: str, token: str, 
                json_data: Optional[Dict] = None, 
                params: Optional[Dict] = None,
                expected_status: Optional[int] = None) -> requests.Response:
    """Make authenticated request"""
    headers = {"Authorization": f"Bearer {token}"}
    url = f"{BASE_URL}{endpoint}"
    
    try:
        if method == "GET":
            resp = requests.get(url, headers=headers, params=params, timeout=30)
        elif method == "POST":
            resp = requests.post(url, headers=headers, json=json_data, timeout=30)
        elif method == "PATCH":
            resp = requests.patch(url, headers=headers, json=json_data, timeout=30)
        elif method == "DELETE":
            resp = requests.delete(url, headers=headers, timeout=30)
        else:
            raise ValueError(f"Unsupported method: {method}")
        
        if expected_status and resp.status_code != expected_status:
            print(f"  ⚠️  Expected {expected_status}, got {resp.status_code}: {resp.text[:200]}")
        
        return resp
    except Exception as e:
        print(f"Request error: {e}")
        raise

def cleanup():
    """Clean up all created test data"""
    print("\n" + "="*80)
    print("CLEANUP: Removing all test data...")
    print("="*80)
    
    auth = login(SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD)
    if not auth:
        print("❌ Cannot login for cleanup")
        return
    
    token = auth["token"]
    
    # Delete assignments
    for aid in created_assignments:
        try:
            resp = make_request("DELETE", f"/assignments/{aid}", token)
            if resp.status_code == 200:
                print(f"✅ Deleted assignment {aid}")
        except:
            pass
    
    # Delete reschedules
    for rid in created_reschedules:
        try:
            resp = make_request("DELETE", f"/reschedules/{rid}", token)
            if resp.status_code == 200:
                print(f"✅ Deleted reschedule {rid}")
        except:
            pass
    
    # Delete classes
    for cid in created_classes:
        try:
            resp = make_request("DELETE", f"/classes/{cid}", token)
            if resp.status_code == 200:
                print(f"✅ Deleted class {cid}")
        except:
            pass
    
    # Delete users
    for uid in created_users:
        try:
            resp = make_request("DELETE", f"/users/{uid}", token)
            if resp.status_code == 200:
                print(f"✅ Deleted user {uid}")
        except:
            pass
    
    # Delete subjects
    for sid in created_subjects:
        try:
            resp = make_request("DELETE", f"/subjects/{sid}", token)
            if resp.status_code == 200:
                print(f"✅ Deleted subject {sid}")
        except:
            pass
    
    print("✅ Cleanup complete\n")

def test_scenario_a_subjects_crud():
    """A) Subjects master CRUD (/api/subjects)"""
    print("\n" + "="*80)
    print("SCENARIO A: Subjects Master CRUD")
    print("="*80)
    
    auth = login(SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD)
    if not auth:
        log_result("A", "Login", False, "Cannot login as super_admin")
        return
    
    token = auth["token"]
    
    # 1. POST /api/subjects {name:"Matematika QA"} -> 200
    suffix = random_suffix()
    subject1_name = f"Matematika QA {suffix}"
    resp = make_request("POST", "/subjects", token, 
                       json_data={"name": subject1_name},
                       expected_status=200)
    
    if resp.status_code == 200:
        data = resp.json()
        if "id" in data and "name" in data and data["name"] == subject1_name:
            created_subjects.append(data["id"])
            log_result("A", "Create subject 'Matematika QA'", True, 
                      f"Created with id={data['id']}")
        else:
            log_result("A", "Create subject 'Matematika QA'", False, 
                      f"Missing id or name in response: {data}")
    else:
        log_result("A", "Create subject 'Matematika QA'", False, 
                  f"Status {resp.status_code}: {resp.text[:200]}")
    
    # 2. POST same name again -> expect 400 (duplicate)
    resp = make_request("POST", "/subjects", token, 
                       json_data={"name": subject1_name},
                       expected_status=400)
    
    passed = resp.status_code == 400
    log_result("A", "Duplicate subject returns 400", passed,
              f"Status {resp.status_code}")
    
    # 3. GET /api/subjects -> list includes it
    resp = make_request("GET", "/subjects", token, expected_status=200)
    
    if resp.status_code == 200:
        subjects = resp.json()
        found = any(s.get("name") == subject1_name for s in subjects)
        log_result("A", "GET /subjects includes created subject", found,
                  f"Found={found}, total subjects={len(subjects)}")
    else:
        log_result("A", "GET /subjects includes created subject", False,
                  f"Status {resp.status_code}")
    
    # 4. Also create subject "Sejarah QA"
    subject2_name = f"Sejarah QA {suffix}"
    resp = make_request("POST", "/subjects", token, 
                       json_data={"name": subject2_name},
                       expected_status=200)
    
    if resp.status_code == 200:
        data = resp.json()
        created_subjects.append(data["id"])
        log_result("A", "Create subject 'Sejarah QA'", True,
                  f"Created with id={data['id']}")
    else:
        log_result("A", "Create subject 'Sejarah QA'", False,
                  f"Status {resp.status_code}")
    
    return subject1_name, subject2_name

def test_scenario_b_guru_subject_access(subject1_name: str, subject2_name: str):
    """B) Guru subject-based class access"""
    print("\n" + "="*80)
    print("SCENARIO B: Guru Subject-Based Class Access")
    print("="*80)
    
    auth = login(SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD)
    if not auth:
        log_result("B", "Login", False, "Cannot login as super_admin")
        return None, None, None
    
    token = auth["token"]
    suffix = random_suffix()
    
    # 1. Create class "QA XI IPA 1" with subjects=["Matematika QA"]
    class1_name = f"QA XI IPA 1 {suffix}"
    resp = make_request("POST", "/classes", token,
                       json_data={"name": class1_name, "subjects": [subject1_name]},
                       expected_status=200)
    
    class1_id = None
    if resp.status_code == 200:
        data = resp.json()
        class1_id = data["id"]
        created_classes.append(class1_id)
        log_result("B", "Create class with Matematika subject", True,
                  f"Class id={class1_id}")
    else:
        log_result("B", "Create class with Matematika subject", False,
                  f"Status {resp.status_code}")
        return None, None, None
    
    # 2. Create class "QA XII IPS 1" with subjects=["Sejarah QA"]
    class2_name = f"QA XII IPS 1 {suffix}"
    resp = make_request("POST", "/classes", token,
                       json_data={"name": class2_name, "subjects": [subject2_name]},
                       expected_status=200)
    
    class2_id = None
    if resp.status_code == 200:
        data = resp.json()
        class2_id = data["id"]
        created_classes.append(class2_id)
        log_result("B", "Create class with Sejarah subject", True,
                  f"Class id={class2_id}")
    else:
        log_result("B", "Create class with Sejarah subject", False,
                  f"Status {resp.status_code}")
        return class1_id, None, None
    
    # 3. Create a guru account with subjects=["Matematika QA"]
    guru_email = f"guru.qa.{suffix}@sekolah.id"
    guru_password = "Guru12345"
    resp = make_request("POST", "/users", token,
                       json_data={
                           "email": guru_email,
                           "password": guru_password,
                           "name": f"Guru QA {suffix}",
                           "role": "guru",
                           "subjects": [subject1_name]
                       },
                       expected_status=200)
    
    guru_id = None
    if resp.status_code == 200:
        data = resp.json()
        guru_id = data["id"]
        created_users.append(guru_id)
        log_result("B", "Create guru with Matematika subject", True,
                  f"Guru id={guru_id}")
    else:
        log_result("B", "Create guru with Matematika subject", False,
                  f"Status {resp.status_code}")
        return class1_id, class2_id, None
    
    # Login as guru
    guru_auth = login(guru_email, guru_password)
    if not guru_auth:
        log_result("B", "Login as guru", False, "Cannot login")
        return class1_id, class2_id, guru_id
    
    guru_token = guru_auth["token"]
    log_result("B", "Login as guru", True, f"Token obtained")
    
    # 4. As guru: GET /api/classes -> should INCLUDE "QA XI IPA 1" but NOT "QA XII IPS 1"
    resp = make_request("GET", "/classes", guru_token, expected_status=200)
    
    if resp.status_code == 200:
        classes = resp.json()
        class_names = [c.get("name") for c in classes]
        
        has_class1 = class1_name in class_names
        has_class2 = class2_name in class_names
        
        log_result("B", "Guru sees class with their subject (XI IPA 1)", has_class1,
                  f"Found={has_class1}")
        log_result("B", "Guru does NOT see class without their subject (XII IPS 1)", not has_class2,
                  f"Found={has_class2} (should be False)")
    else:
        log_result("B", "Guru GET /classes", False, f"Status {resp.status_code}")
    
    # 5. As guru: GET /api/classes/{id of QA XI IPA 1} -> 200
    resp = make_request("GET", f"/classes/{class1_id}", guru_token, expected_status=200)
    passed = resp.status_code == 200
    log_result("B", "Guru can access class with their subject (GET by id)", passed,
              f"Status {resp.status_code}")
    
    # As guru: GET /api/classes/{id of QA XII IPS 1} -> expect 403
    resp = make_request("GET", f"/classes/{class2_id}", guru_token, expected_status=403)
    passed = resp.status_code == 403
    log_result("B", "Guru gets 403 for class without their subject", passed,
              f"Status {resp.status_code}")
    
    # 6. As guru: POST /api/classes -> expect 403 (only super_admin creates)
    resp = make_request("POST", "/classes", guru_token,
                       json_data={"name": f"guru-made {suffix}", "subjects": []},
                       expected_status=403)
    passed = resp.status_code == 403
    log_result("B", "Guru cannot create class (403)", passed,
              f"Status {resp.status_code}")
    
    # As guru: PATCH class -> expect 403
    resp = make_request("PATCH", f"/classes/{class1_id}", guru_token,
                       json_data={"description": "test"},
                       expected_status=403)
    passed = resp.status_code == 403
    log_result("B", "Guru cannot update class (403)", passed,
              f"Status {resp.status_code}")
    
    # As guru: DELETE class -> expect 403
    resp = make_request("DELETE", f"/classes/{class1_id}", guru_token,
                       expected_status=403)
    passed = resp.status_code == 403
    log_result("B", "Guru cannot delete class (403)", passed,
              f"Status {resp.status_code}")
    
    return class1_id, class2_id, guru_id

def test_scenario_c_student_isolation(class1_name: str, class1_id: str, 
                                     class2_name: str, class2_id: str):
    """C) Student class isolation"""
    print("\n" + "="*80)
    print("SCENARIO C: Student Class Isolation")
    print("="*80)
    
    auth = login(SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD)
    if not auth:
        log_result("C", "Login", False, "Cannot login as super_admin")
        return None, None
    
    token = auth["token"]
    suffix = random_suffix()
    
    # 1. Create siswa A: role siswa, kelas="QA XI IPA 1"
    siswa_a_email = f"siswa.a.{suffix}@sekolah.id"
    siswa_a_password = "Siswa12345"
    resp = make_request("POST", "/users", token,
                       json_data={
                           "email": siswa_a_email,
                           "password": siswa_a_password,
                           "name": f"Siswa A {suffix}",
                           "role": "siswa",
                           "kelas": class1_name,
                           "nisn": f"1234{suffix}"
                       },
                       expected_status=200)
    
    siswa_a_id = None
    if resp.status_code == 200:
        data = resp.json()
        siswa_a_id = data["id"]
        created_users.append(siswa_a_id)
        log_result("C", "Create siswa A in class XI IPA 1", True,
                  f"Siswa A id={siswa_a_id}")
    else:
        log_result("C", "Create siswa A in class XI IPA 1", False,
                  f"Status {resp.status_code}")
        return None, None
    
    # Create siswa B: kelas="QA XII IPS 1"
    siswa_b_email = f"siswa.b.{suffix}@sekolah.id"
    siswa_b_password = "Siswa12345"
    resp = make_request("POST", "/users", token,
                       json_data={
                           "email": siswa_b_email,
                           "password": siswa_b_password,
                           "name": f"Siswa B {suffix}",
                           "role": "siswa",
                           "kelas": class2_name,
                           "nisn": f"5678{suffix}"
                       },
                       expected_status=200)
    
    siswa_b_id = None
    if resp.status_code == 200:
        data = resp.json()
        siswa_b_id = data["id"]
        created_users.append(siswa_b_id)
        log_result("C", "Create siswa B in class XII IPS 1", True,
                  f"Siswa B id={siswa_b_id}")
    else:
        log_result("C", "Create siswa B in class XII IPS 1", False,
                  f"Status {resp.status_code}")
        return siswa_a_id, None
    
    # Login as siswa A
    siswa_a_auth = login(siswa_a_email, siswa_a_password)
    if not siswa_a_auth:
        log_result("C", "Login as siswa A", False, "Cannot login")
        return siswa_a_id, siswa_b_id
    
    siswa_a_token = siswa_a_auth["token"]
    log_result("C", "Login as siswa A", True, "Token obtained")
    
    # 2. As siswa A: GET /api/classes -> only "QA XI IPA 1"
    resp = make_request("GET", "/classes", siswa_a_token, expected_status=200)
    
    if resp.status_code == 200:
        classes = resp.json()
        class_names = [c.get("name") for c in classes]
        
        has_own_class = class1_name in class_names
        has_other_class = class2_name in class_names
        only_own = has_own_class and not has_other_class and len(classes) == 1
        
        log_result("C", "Siswa A sees only their own class", only_own,
                  f"Classes: {class_names}, expected only [{class1_name}]")
    else:
        log_result("C", "Siswa A GET /classes", False, f"Status {resp.status_code}")
    
    # As siswa A: GET /api/classes/{QA XII IPS 1 id} -> expect 403
    resp = make_request("GET", f"/classes/{class2_id}", siswa_a_token, expected_status=403)
    passed = resp.status_code == 403
    log_result("C", "Siswa A gets 403 for other class", passed,
              f"Status {resp.status_code}")
    
    return siswa_a_id, siswa_b_id

def test_scenario_d_assignment_subject_permission(class1_name: str, class1_id: str,
                                                 subject1_name: str, subject2_name: str):
    """D) Assignment subject permission"""
    print("\n" + "="*80)
    print("SCENARIO D: Assignment Subject Permission")
    print("="*80)
    
    # Login as the guru (who teaches Matematika QA)
    # We need to get guru credentials from scenario B
    # For simplicity, we'll create a new guru or reuse
    
    auth = login(SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD)
    if not auth:
        log_result("D", "Login", False, "Cannot login as super_admin")
        return None
    
    token = auth["token"]
    suffix = random_suffix()
    
    # Create a guru with Matematika subject
    guru_email = f"guru.d.{suffix}@sekolah.id"
    guru_password = "Guru12345"
    resp = make_request("POST", "/users", token,
                       json_data={
                           "email": guru_email,
                           "password": guru_password,
                           "name": f"Guru D {suffix}",
                           "role": "guru",
                           "subjects": [subject1_name]
                       },
                       expected_status=200)
    
    if resp.status_code == 200:
        guru_id = resp.json()["id"]
        created_users.append(guru_id)
        log_result("D", "Create guru with Matematika subject", True, f"Guru id={guru_id}")
    else:
        log_result("D", "Create guru with Matematika subject", False, f"Status {resp.status_code}")
        return None
    
    # Login as guru
    guru_auth = login(guru_email, guru_password)
    if not guru_auth:
        log_result("D", "Login as guru", False, "Cannot login")
        return None
    
    guru_token = guru_auth["token"]
    
    # 1. As guru: POST /api/assignments for class with Matematika subject -> expect 200
    resp = make_request("POST", "/assignments", guru_token,
                       json_data={
                           "title": f"Assignment QA {suffix}",
                           "description": "Test assignment",
                           "kelas": class1_name,
                           "class_id": class1_id,
                           "due_date": "2025-12-01",
                           "subject": subject1_name
                       },
                       expected_status=200)
    
    assignment_id = None
    if resp.status_code == 200:
        data = resp.json()
        assignment_id = data["id"]
        created_assignments.append(assignment_id)
        log_result("D", "Guru can create assignment for subject they teach", True,
                  f"Assignment id={assignment_id}")
    else:
        log_result("D", "Guru can create assignment for subject they teach", False,
                  f"Status {resp.status_code}: {resp.text[:200]}")
    
    # 2. As guru: POST /api/assignments for same class but subject they don't teach -> expect 403
    resp = make_request("POST", "/assignments", guru_token,
                       json_data={
                           "title": f"Assignment QA Wrong {suffix}",
                           "description": "Test assignment",
                           "kelas": class1_name,
                           "class_id": class1_id,
                           "due_date": "2025-12-01",
                           "subject": subject2_name  # Sejarah - not taught by this guru
                       },
                       expected_status=403)
    
    passed = resp.status_code == 403
    log_result("D", "Guru gets 403 for assignment with subject they don't teach", passed,
              f"Status {resp.status_code}")
    
    return assignment_id

def test_scenario_e_submission_warehouse(assignment_id: str, siswa_a_id: str, 
                                        siswa_b_id: str, class1_name: str):
    """E) Submission warehouse (/api/submissions/status)"""
    print("\n" + "="*80)
    print("SCENARIO E: Submission Warehouse")
    print("="*80)
    
    if not assignment_id:
        log_result("E", "Prerequisites", False, "No assignment_id from scenario D")
        return
    
    auth = login(SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD)
    if not auth:
        log_result("E", "Login", False, "Cannot login as super_admin")
        return
    
    token = auth["token"]
    
    # Get siswa A credentials
    suffix = random_suffix()
    
    # We need to find siswa A's email - let's get it from the user
    resp = make_request("GET", f"/users", token, params={"role": "siswa"})
    if resp.status_code != 200:
        log_result("E", "Get users", False, "Cannot get users")
        return
    
    users = resp.json()
    siswa_a = next((u for u in users if u["id"] == siswa_a_id), None)
    siswa_b = next((u for u in users if u["id"] == siswa_b_id), None)
    
    if not siswa_a or not siswa_b:
        log_result("E", "Find siswa accounts", False, "Cannot find siswa A or B")
        return
    
    siswa_a_email = siswa_a["email"]
    siswa_b_email = siswa_b["email"]
    
    # Login as siswa A (password is standard from test)
    siswa_a_auth = login(siswa_a_email, "Siswa12345")
    if not siswa_a_auth:
        log_result("E", "Login as siswa A", False, "Cannot login")
        return
    
    siswa_a_token = siswa_a_auth["token"]
    
    # 1. As siswa A: POST /api/submissions
    resp = make_request("POST", "/submissions", siswa_a_token,
                       json_data={
                           "assignment_id": assignment_id,
                           "content": "jawaban A"
                       },
                       expected_status=200)
    
    passed = resp.status_code == 200
    log_result("E", "Siswa A submits assignment", passed,
              f"Status {resp.status_code}")
    
    # 2. As siswa A: GET /api/submissions/status?assignment_id=<id>
    resp = make_request("GET", "/submissions/status", siswa_a_token,
                       params={"assignment_id": assignment_id},
                       expected_status=200)
    
    if resp.status_code == 200:
        data = resp.json()
        
        # Check structure
        has_roster = "roster" in data
        has_counts = "submitted_count" in data and "total" in data
        has_privileged = "privileged" in data
        
        log_result("E", "Submission status returns correct structure", 
                  has_roster and has_counts and has_privileged,
                  f"roster={has_roster}, counts={has_counts}, privileged={has_privileged}")
        
        # Check privileged is false for student
        is_not_privileged = data.get("privileged") == False
        log_result("E", "Student has privileged=false", is_not_privileged,
                  f"privileged={data.get('privileged')}")
        
        # Check roster entries
        roster = data.get("roster", [])
        if roster:
            first_entry = roster[0]
            has_student_name = "student_name" in first_entry
            has_submitted = "submitted" in first_entry
            has_submitted_at = "submitted_at" in first_entry
            has_is_me = "is_me" in first_entry
            no_content = "content" not in first_entry
            no_attachments = "attachments" not in first_entry
            
            log_result("E", "Roster entries have correct fields", 
                      has_student_name and has_submitted and has_submitted_at and has_is_me,
                      f"student_name={has_student_name}, submitted={has_submitted}, submitted_at={has_submitted_at}, is_me={has_is_me}")
            
            log_result("E", "Roster entries do NOT contain content/attachments", 
                      no_content and no_attachments,
                      f"content={not no_content}, attachments={not no_attachments}")
            
            # Check siswa A shows submitted=true
            siswa_a_entry = next((r for r in roster if r.get("student_id") == siswa_a_id), None)
            if siswa_a_entry:
                is_submitted = siswa_a_entry.get("submitted") == True
                log_result("E", "Siswa A shows submitted=true", is_submitted,
                          f"submitted={siswa_a_entry.get('submitted')}")
            else:
                log_result("E", "Siswa A shows submitted=true", False,
                          "Siswa A not found in roster")
        else:
            log_result("E", "Roster has entries", False, "Roster is empty")
    else:
        log_result("E", "GET /submissions/status", False, f"Status {resp.status_code}")
    
    # 3. As siswa B (different kelas): GET /api/submissions/status -> expect 403
    siswa_b_auth = login(siswa_b_email, "Siswa12345")
    if not siswa_b_auth:
        log_result("E", "Login as siswa B", False, "Cannot login")
        return
    
    siswa_b_token = siswa_b_auth["token"]
    
    resp = make_request("GET", "/submissions/status", siswa_b_token,
                       params={"assignment_id": assignment_id},
                       expected_status=403)
    
    passed = resp.status_code == 403
    log_result("E", "Siswa B (different class) gets 403", passed,
              f"Status {resp.status_code}")
    
    # 4. As guru: GET /api/submissions/status -> privileged=true
    # We need guru credentials - let's use super_admin for simplicity
    resp = make_request("GET", "/submissions/status", token,
                       params={"assignment_id": assignment_id},
                       expected_status=200)
    
    if resp.status_code == 200:
        data = resp.json()
        is_privileged = data.get("privileged") == True
        log_result("E", "Super admin has privileged=true", is_privileged,
                  f"privileged={data.get('privileged')}")
    else:
        log_result("E", "Super admin GET /submissions/status", False,
                  f"Status {resp.status_code}")

def test_scenario_f_reschedule(class1_id: str, class1_name: str, 
                              class2_id: str, subject1_name: str):
    """F) Reschedule / teacher-absence notices"""
    print("\n" + "="*80)
    print("SCENARIO F: Reschedule Notices")
    print("="*80)
    
    auth = login(SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD)
    if not auth:
        log_result("F", "Login", False, "Cannot login as super_admin")
        return
    
    token = auth["token"]
    suffix = random_suffix()
    
    # Create a guru with Matematika subject
    guru_email = f"guru.f.{suffix}@sekolah.id"
    guru_password = "Guru12345"
    resp = make_request("POST", "/users", token,
                       json_data={
                           "email": guru_email,
                           "password": guru_password,
                           "name": f"Guru F {suffix}",
                           "role": "guru",
                           "subjects": [subject1_name]
                       },
                       expected_status=200)
    
    if resp.status_code == 200:
        guru_id = resp.json()["id"]
        created_users.append(guru_id)
        log_result("F", "Create guru with Matematika subject", True, f"Guru id={guru_id}")
    else:
        log_result("F", "Create guru with Matematika subject", False, f"Status {resp.status_code}")
        return
    
    # Login as guru
    guru_auth = login(guru_email, guru_password)
    if not guru_auth:
        log_result("F", "Login as guru", False, "Cannot login")
        return
    
    guru_token = guru_auth["token"]
    
    # 1. As guru: POST /api/reschedules for class they can access -> 200
    resp = make_request("POST", "/reschedules", guru_token,
                       json_data={
                           "class_id": class1_id,
                           "subject": subject1_name,
                           "reason_type": "sakit",
                           "reason": "Demam",
                           "new_date": "2025-12-05",
                           "new_time": "08:00"
                       },
                       expected_status=200)
    
    reschedule_id = None
    if resp.status_code == 200:
        data = resp.json()
        reschedule_id = data["id"]
        created_reschedules.append(reschedule_id)
        log_result("F", "Guru creates reschedule notice", True,
                  f"Reschedule id={reschedule_id}")
    else:
        log_result("F", "Guru creates reschedule notice", False,
                  f"Status {resp.status_code}: {resp.text[:200]}")
    
    # 2. GET /api/reschedules?class_id=<id> -> includes the active notice
    resp = make_request("GET", "/reschedules", guru_token,
                       params={"class_id": class1_id},
                       expected_status=200)
    
    if resp.status_code == 200:
        reschedules = resp.json()
        found = any(r.get("id") == reschedule_id for r in reschedules)
        log_result("F", "GET /reschedules includes created notice", found,
                  f"Found={found}, total={len(reschedules)}")
    else:
        log_result("F", "GET /reschedules", False, f"Status {resp.status_code}")
    
    # 3. As siswa A: GET /reschedules (no class_id) -> should return notices for their class
    # We need to get siswa A from scenario C
    resp = make_request("GET", "/users", token, params={"role": "siswa"})
    if resp.status_code == 200:
        users = resp.json()
        siswa_in_class1 = next((u for u in users if u.get("kelas") == class1_name), None)
        
        if siswa_in_class1:
            siswa_auth = login(siswa_in_class1["email"], "Siswa12345")
            if siswa_auth:
                siswa_token = siswa_auth["token"]
                
                resp = make_request("GET", "/reschedules", siswa_token,
                                   expected_status=200)
                
                if resp.status_code == 200:
                    reschedules = resp.json()
                    found = any(r.get("id") == reschedule_id for r in reschedules)
                    log_result("F", "Siswa sees reschedule for their class", found,
                              f"Found={found}, total={len(reschedules)}")
                else:
                    log_result("F", "Siswa GET /reschedules", False,
                              f"Status {resp.status_code}")
            else:
                log_result("F", "Login as siswa", False, "Cannot login")
        else:
            log_result("F", "Find siswa in class", False, "No siswa found")
    else:
        log_result("F", "Get users", False, "Cannot get users")
    
    # 4. As guru: DELETE /api/reschedules/{id} -> 200
    if reschedule_id:
        resp = make_request("DELETE", f"/reschedules/{reschedule_id}", guru_token,
                           expected_status=200)
        
        passed = resp.status_code == 200
        log_result("F", "Guru deletes reschedule notice", passed,
                  f"Status {resp.status_code}")
        
        # GET again -> should no longer be active
        resp = make_request("GET", "/reschedules", guru_token,
                           params={"class_id": class1_id},
                           expected_status=200)
        
        if resp.status_code == 200:
            reschedules = resp.json()
            not_found = not any(r.get("id") == reschedule_id for r in reschedules)
            log_result("F", "Deleted reschedule no longer appears", not_found,
                      f"Found={not not_found}")
        else:
            log_result("F", "GET /reschedules after delete", False,
                      f"Status {resp.status_code}")
    
    # 5. As guru: try POST /api/reschedules for class they don't access -> expect 403
    if class2_id:
        resp = make_request("POST", "/reschedules", guru_token,
                           json_data={
                               "class_id": class2_id,
                               "subject": subject1_name,
                               "reason_type": "sakit",
                               "reason": "Test",
                               "new_date": "2025-12-05",
                               "new_time": "08:00"
                           },
                           expected_status=403)
        
        passed = resp.status_code == 403
        log_result("F", "Guru gets 403 for class they don't access", passed,
                  f"Status {resp.status_code}")

def main():
    """Run all test scenarios"""
    print("\n" + "="*80)
    print("SEKOLAHKU CLASS ENHANCEMENT BACKEND TESTS")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print(f"Super Admin: {SUPER_ADMIN_EMAIL}")
    print("="*80)
    
    try:
        # Run all scenarios
        subject1_name, subject2_name = test_scenario_a_subjects_crud()
        
        class1_id, class2_id, guru_id = test_scenario_b_guru_subject_access(
            subject1_name, subject2_name)
        
        # Get class names for scenario C
        auth = login(SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD)
        if auth and class1_id and class2_id:
            token = auth["token"]
            resp = make_request("GET", f"/classes/{class1_id}", token)
            class1_name = resp.json()["name"] if resp.status_code == 200 else None
            resp = make_request("GET", f"/classes/{class2_id}", token)
            class2_name = resp.json()["name"] if resp.status_code == 200 else None
            
            if class1_name and class2_name:
                siswa_a_id, siswa_b_id = test_scenario_c_student_isolation(
                    class1_name, class1_id, class2_name, class2_id)
                
                assignment_id = test_scenario_d_assignment_subject_permission(
                    class1_name, class1_id, subject1_name, subject2_name)
                
                if assignment_id and siswa_a_id and siswa_b_id:
                    test_scenario_e_submission_warehouse(
                        assignment_id, siswa_a_id, siswa_b_id, class1_name)
                
                test_scenario_f_reschedule(
                    class1_id, class1_name, class2_id, subject1_name)
        
    finally:
        # Always cleanup
        cleanup()
    
    # Print summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    passed_count = sum(1 for p, _ in test_results if p)
    failed_count = sum(1 for p, _ in test_results if not p)
    total_count = len(test_results)
    
    print(f"\nTotal: {total_count} tests")
    print(f"✅ Passed: {passed_count}")
    print(f"❌ Failed: {failed_count}")
    
    if failed_count > 0:
        print("\n❌ FAILED TESTS:")
        for passed, result in test_results:
            if not passed:
                print(f"  {result}")
    
    print("\n" + "="*80)
    
    # Exit with appropriate code
    sys.exit(0 if failed_count == 0 else 1)

if __name__ == "__main__":
    main()
