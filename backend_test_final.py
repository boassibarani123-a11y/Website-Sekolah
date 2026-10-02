#!/usr/bin/env python3
"""
Backend Test Suite for SEKOLAHKU - New Features (Oct 2025) - FINAL
Tests: Bendahara, Salin BPH, Inventory++, Ujian Anti-Nyontek, Upload/Storage
"""
import requests
import json
import sys
import io
from typing import Optional

# Configuration
BASE_URL = "https://school-site-54.preview.emergentagent.com/api"
SUPER_ADMIN_EMAIL = "boassibarani123@gmail.com"
SUPER_ADMIN_PASSWORD = "Boas12345io"

# Demo accounts
DEMO_PASSWORD = "Demo12345"
ADMIN_DEMO_EMAIL = "admin.demo@sekolahku.id"  # Demo super_admin for demo-isolated testing
KELAS_DEMO_EMAIL = "kelas.demo@sekolahku.id"
GURU_DEMO_EMAIL = "guru.demo@sekolahku.id"
SISWA_DEMO_EMAIL = "siswa.demo@sekolahku.id"
TU_DEMO_EMAIL = "tu.demo@sekolahku.id"

# Test state
super_token = None
admin_demo_token = None
kelas_token = None
guru_token = None
siswa_token = None
tu_token = None
xi_ipa_1_id = None
demo_siswa1_id = None
demo_siswa2_id = None
demo_siswa1_email = None
demo_siswa2_email = None
test_class_id = None
test_exam_id = None
test_inventory_id = None

def log(msg: str, level: str = "INFO"):
    """Log test messages"""
    print(f"[{level}] {msg}")

def login(email: str, password: str) -> tuple[Optional[str], Optional[dict]]:
    """Login and return (token, user_object)"""
    try:
        resp = requests.post(f"{BASE_URL}/auth/login", json={"email": email, "password": password}, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            return data.get("token"), data.get("user")
        else:
            log(f"Login failed for {email}: {resp.status_code} - {resp.text}", "ERROR")
            return None, None
    except Exception as e:
        log(f"Login exception for {email}: {e}", "ERROR")
        return None, None

# ============ SETUP ============
def setup_auth():
    """Login all required accounts"""
    global super_token, admin_demo_token, kelas_token, guru_token, siswa_token, tu_token
    
    log("=== SETUP: Logging in accounts ===")
    
    # Super admin (non-demo)
    super_token, _ = login(SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD)
    if not super_token:
        log("❌ FATAL: Cannot login super admin", "ERROR")
        return False
    log("✅ Super admin logged in")
    
    # Demo super admin (for demo-isolated testing)
    admin_demo_token, _ = login(ADMIN_DEMO_EMAIL, DEMO_PASSWORD)
    if not admin_demo_token:
        log("❌ FATAL: Cannot login admin.demo", "ERROR")
        return False
    log("✅ admin.demo logged in")
    
    # Demo accounts
    kelas_token, _ = login(KELAS_DEMO_EMAIL, DEMO_PASSWORD)
    if not kelas_token:
        log("❌ FATAL: Cannot login kelas.demo", "ERROR")
        return False
    log("✅ kelas.demo logged in")
    
    guru_token, _ = login(GURU_DEMO_EMAIL, DEMO_PASSWORD)
    if not guru_token:
        log("❌ FATAL: Cannot login guru.demo", "ERROR")
        return False
    log("✅ guru.demo logged in")
    
    siswa_token, _ = login(SISWA_DEMO_EMAIL, DEMO_PASSWORD)
    if not siswa_token:
        log("❌ FATAL: Cannot login siswa.demo", "ERROR")
        return False
    log("✅ siswa.demo logged in")
    
    tu_token, _ = login(TU_DEMO_EMAIL, DEMO_PASSWORD)
    if not tu_token:
        log("❌ FATAL: Cannot login tu.demo", "ERROR")
        return False
    log("✅ tu.demo logged in")
    
    return True

def find_xi_ipa_1():
    """Find XI IPA 1 class ID"""
    global xi_ipa_1_id
    
    log("=== SETUP: Finding XI IPA 1 class ===")
    
    headers = {"Authorization": f"Bearer {kelas_token}"}
    try:
        resp = requests.get(f"{BASE_URL}/classes", headers=headers, timeout=10)
        if resp.status_code == 200:
            classes = resp.json()
            for c in classes:
                if c.get("name") == "XI IPA 1":
                    xi_ipa_1_id = c["id"]
                    log(f"✅ Found XI IPA 1: {xi_ipa_1_id}")
                    return True
            log("❌ FATAL: XI IPA 1 not found", "ERROR")
            return False
        else:
            log(f"❌ FATAL: GET /classes returned {resp.status_code}", "ERROR")
            return False
    except Exception as e:
        log(f"❌ FATAL: Exception finding XI IPA 1: {e}", "ERROR")
        return False

def find_demo_students():
    """Find demo students in XI IPA 1"""
    global demo_siswa1_id, demo_siswa2_id, demo_siswa1_email, demo_siswa2_email
    
    log("=== SETUP: Finding demo students in XI IPA 1 ===")
    
    headers = {"Authorization": f"Bearer {admin_demo_token}"}
    try:
        resp = requests.get(f"{BASE_URL}/users?role=siswa", headers=headers, timeout=10)
        if resp.status_code == 200:
            users = resp.json()
            demo_students = [u for u in users if u.get("kelas") == "XI IPA 1" and u.get("is_demo")]
            
            if len(demo_students) >= 2:
                demo_siswa1_id = demo_students[0]["id"]
                demo_siswa1_email = demo_students[0]["email"]
                demo_siswa2_id = demo_students[1]["id"]
                demo_siswa2_email = demo_students[1]["email"]
                log(f"✅ Found demo students: {demo_siswa1_email}, {demo_siswa2_email}")
                return True
            else:
                log(f"❌ FATAL: Found only {len(demo_students)} demo students in XI IPA 1", "ERROR")
                return False
        else:
            log(f"❌ FATAL: GET /users?role=siswa returned {resp.status_code}", "ERROR")
            return False
    except Exception as e:
        log(f"❌ FATAL: Exception finding demo students: {e}", "ERROR")
        return False

# ============ TEST 1: BENDAHARA (TREASURER) ============
def test_1_set_treasurer():
    """Test 1.1: Set treasurer as ketua_kelas"""
    log("\n=== TEST 1.1: Set Treasurer (as ketua_kelas) ===")
    
    headers = {"Authorization": f"Bearer {kelas_token}"}
    payload = {"student_id": demo_siswa1_id}
    
    try:
        resp = requests.put(f"{BASE_URL}/classes/{xi_ipa_1_id}/treasurer", 
                           json=payload, headers=headers, timeout=10)
        log(f"PUT /classes/{xi_ipa_1_id}/treasurer -> {resp.status_code}")
        
        if resp.status_code == 200:
            data = resp.json()
            if "treasurer_id" in data and "treasurer_name" in data:
                if data["treasurer_id"] == demo_siswa1_id:
                    log(f"✅ PASS: Treasurer set successfully: {data['treasurer_name']}", "SUCCESS")
                    return True
                else:
                    log(f"❌ FAIL: treasurer_id mismatch", "ERROR")
                    return False
            else:
                log(f"❌ FAIL: Missing fields in response", "ERROR")
                return False
        else:
            log(f"❌ FAIL: Expected 200, got {resp.status_code} - {resp.text}", "ERROR")
            return False
    except Exception as e:
        log(f"❌ FAIL: Exception - {e}", "ERROR")
        return False

def test_2_verify_treasurer_in_class():
    """Test 1.2: Verify treasurer_id in GET /classes/{cid}"""
    log("\n=== TEST 1.2: Verify Treasurer in Class ===")
    
    headers = {"Authorization": f"Bearer {kelas_token}"}
    
    try:
        resp = requests.get(f"{BASE_URL}/classes/{xi_ipa_1_id}", headers=headers, timeout=10)
        log(f"GET /classes/{xi_ipa_1_id} -> {resp.status_code}")
        
        if resp.status_code == 200:
            data = resp.json()
            if data.get("treasurer_id") == demo_siswa1_id and data.get("can_manage_kas"):
                log(f"✅ PASS: treasurer_id set, can_manage_kas=true for ketua", "SUCCESS")
                return True
            else:
                log(f"❌ FAIL: treasurer_id={data.get('treasurer_id')}, can_manage_kas={data.get('can_manage_kas')}", "ERROR")
                return False
        else:
            log(f"❌ FAIL: Expected 200, got {resp.status_code}", "ERROR")
            return False
    except Exception as e:
        log(f"❌ FAIL: Exception - {e}", "ERROR")
        return False

def test_3_bendahara_can_manage_kas():
    """Test 1.3: Bendahara can add kas entry"""
    log("\n=== TEST 1.3: Bendahara Can Add Kas ===")
    
    # Login as the appointed bendahara (fresh token)
    bendahara_token, _ = login(demo_siswa1_email, DEMO_PASSWORD)
    if not bendahara_token:
        log(f"❌ FAIL: Cannot login as bendahara", "ERROR")
        return False
    
    # First verify can_manage_kas for bendahara
    headers = {"Authorization": f"Bearer {bendahara_token}"}
    try:
        resp = requests.get(f"{BASE_URL}/classes/{xi_ipa_1_id}", headers=headers, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if not data.get("can_manage_kas"):
                log(f"❌ FAIL: can_manage_kas should be true for bendahara", "ERROR")
                return False
            log("✅ can_manage_kas=true for bendahara")
        else:
            log(f"❌ FAIL: GET /classes/{xi_ipa_1_id} returned {resp.status_code}", "ERROR")
            return False
    except Exception as e:
        log(f"❌ FAIL: Exception checking can_manage_kas: {e}", "ERROR")
        return False
    
    # Now try to add kas entry
    payload = {"amount": 1000, "type": "masuk", "description": "QA Test Kas"}
    try:
        resp = requests.post(f"{BASE_URL}/classes/{xi_ipa_1_id}/kas", 
                            json=payload, headers=headers, timeout=10)
        log(f"POST /classes/{xi_ipa_1_id}/kas -> {resp.status_code}")
        
        if resp.status_code == 200:
            log(f"✅ PASS: Bendahara successfully added kas entry", "SUCCESS")
            return True
        else:
            log(f"❌ FAIL: Expected 200, got {resp.status_code} - {resp.text}", "ERROR")
            return False
    except Exception as e:
        log(f"❌ FAIL: Exception - {e}", "ERROR")
        return False

def test_4_non_bendahara_cannot_add_kas():
    """Test 1.4: Non-bendahara siswa cannot add kas"""
    log("\n=== TEST 1.4: Non-Bendahara Cannot Add Kas ===")
    
    # Login as second student (not bendahara)
    siswa2_token, _ = login(demo_siswa2_email, DEMO_PASSWORD)
    if not siswa2_token:
        log(f"❌ FAIL: Cannot login as second student", "ERROR")
        return False
    
    headers = {"Authorization": f"Bearer {siswa2_token}"}
    payload = {"amount": 500, "type": "masuk", "description": "Should Fail"}
    
    try:
        resp = requests.post(f"{BASE_URL}/classes/{xi_ipa_1_id}/kas", 
                            json=payload, headers=headers, timeout=10)
        log(f"POST /classes/{xi_ipa_1_id}/kas (as non-bendahara) -> {resp.status_code}")
        
        if resp.status_code == 403:
            log(f"✅ PASS: Non-bendahara correctly denied (403)", "SUCCESS")
            return True
        else:
            log(f"❌ FAIL: Expected 403, got {resp.status_code}", "ERROR")
            return False
    except Exception as e:
        log(f"❌ FAIL: Exception - {e}", "ERROR")
        return False

def test_5_remove_treasurer():
    """Test 1.5: Remove treasurer"""
    log("\n=== TEST 1.5: Remove Treasurer ===")
    
    headers = {"Authorization": f"Bearer {kelas_token}"}
    
    try:
        resp = requests.delete(f"{BASE_URL}/classes/{xi_ipa_1_id}/treasurer", 
                              headers=headers, timeout=10)
        log(f"DELETE /classes/{xi_ipa_1_id}/treasurer -> {resp.status_code}")
        
        if resp.status_code == 200:
            log(f"✅ PASS: Treasurer removed successfully", "SUCCESS")
            return True
        else:
            log(f"❌ FAIL: Expected 200, got {resp.status_code} - {resp.text}", "ERROR")
            return False
    except Exception as e:
        log(f"❌ FAIL: Exception - {e}", "ERROR")
        return False

def test_6_non_ketua_cannot_set_treasurer():
    """Test 1.6: Non-ketua siswa cannot set treasurer"""
    log("\n=== TEST 1.6: Non-Ketua Cannot Set Treasurer ===")
    
    # Login as regular student
    siswa2_token, _ = login(demo_siswa2_email, DEMO_PASSWORD)
    if not siswa2_token:
        log(f"❌ FAIL: Cannot login as student", "ERROR")
        return False
    
    headers = {"Authorization": f"Bearer {siswa2_token}"}
    payload = {"student_id": demo_siswa1_id}
    
    try:
        resp = requests.put(f"{BASE_URL}/classes/{xi_ipa_1_id}/treasurer", 
                           json=payload, headers=headers, timeout=10)
        log(f"PUT /classes/{xi_ipa_1_id}/treasurer (as non-ketua) -> {resp.status_code}")
        
        if resp.status_code == 403:
            log(f"✅ PASS: Non-ketua correctly denied (403)", "SUCCESS")
            return True
        else:
            log(f"❌ FAIL: Expected 403, got {resp.status_code}", "ERROR")
            return False
    except Exception as e:
        log(f"❌ FAIL: Exception - {e}", "ERROR")
        return False

# ============ TEST 2: SALIN BPH ============
def test_7_create_source_bph():
    """Test 2.1: Create BPH nodes on source class (as ketua_kelas)"""
    log("\n=== TEST 2.1: Create Source BPH Nodes ===")
    
    # Use kelas.demo (ketua_kelas) to create BPH
    headers = {"Authorization": f"Bearer {kelas_token}"}
    
    # Create root BPH node
    payload = {
        "class_id": xi_ipa_1_id,
        "name": "QA Ketua BPH",
        "title": "Ketua",
        "order": 1
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/classes/{xi_ipa_1_id}/bph", 
                            json=payload, headers=headers, timeout=10)
        log(f"POST /classes/{xi_ipa_1_id}/bph (root) -> {resp.status_code}")
        
        if resp.status_code == 200:
            root_data = resp.json()
            root_id = root_data.get("id")
            log(f"✅ Created root BPH node: {root_id}")
            
            # Create child node
            child_payload = {
                "class_id": xi_ipa_1_id,
                "name": "QA Wakil Ketua",
                "title": "Wakil Ketua",
                "parent_id": root_id,
                "order": 2
            }
            
            resp2 = requests.post(f"{BASE_URL}/classes/{xi_ipa_1_id}/bph", 
                                 json=child_payload, headers=headers, timeout=10)
            log(f"POST /classes/{xi_ipa_1_id}/bph (child) -> {resp2.status_code}")
            
            if resp2.status_code == 200:
                log(f"✅ PASS: Created BPH hierarchy", "SUCCESS")
                return True
            else:
                log(f"❌ FAIL: Child node creation failed: {resp2.status_code}", "ERROR")
                return False
        else:
            log(f"❌ FAIL: Root node creation failed: {resp.status_code} - {resp.text}", "ERROR")
            return False
    except Exception as e:
        log(f"❌ FAIL: Exception - {e}", "ERROR")
        return False

def test_8_copy_bph_on_class_creation():
    """Test 2.2: Copy BPH structure when creating new class"""
    global test_class_id
    
    log("\n=== TEST 2.2: Copy BPH on Class Creation ===")
    
    # Use admin.demo (demo super_admin) to create class with copy_bph_from
    headers = {"Authorization": f"Bearer {admin_demo_token}"}
    payload = {
        "name": "QA Copy BPH Test",
        "copy_bph_from": xi_ipa_1_id
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/classes", json=payload, headers=headers, timeout=10)
        log(f"POST /classes (with copy_bph_from) -> {resp.status_code}")
        
        if resp.status_code == 200:
            data = resp.json()
            test_class_id = data.get("id")
            log(f"✅ Created new class: {test_class_id}")
            
            # Verify BPH nodes were copied
            resp2 = requests.get(f"{BASE_URL}/classes/{test_class_id}/bph", 
                                headers=headers, timeout=10)
            log(f"GET /classes/{test_class_id}/bph -> {resp2.status_code}")
            
            if resp2.status_code == 200:
                bph_nodes = resp2.json()
                if len(bph_nodes) >= 2:
                    # Check hierarchy is preserved
                    has_parent_child = any(n.get("parent_id") for n in bph_nodes)
                    if has_parent_child:
                        log(f"✅ PASS: BPH copied with {len(bph_nodes)} nodes, hierarchy preserved", "SUCCESS")
                        return True
                    else:
                        log(f"❌ FAIL: Hierarchy not preserved", "ERROR")
                        return False
                else:
                    log(f"❌ FAIL: Expected at least 2 BPH nodes, got {len(bph_nodes)}", "ERROR")
                    return False
            else:
                log(f"❌ FAIL: GET BPH failed: {resp2.status_code}", "ERROR")
                return False
        else:
            log(f"❌ FAIL: Class creation failed: {resp.status_code} - {resp.text}", "ERROR")
            return False
    except Exception as e:
        log(f"❌ FAIL: Exception - {e}", "ERROR")
        return False

# ============ TEST 3: INVENTORY ============
def test_9_create_inventory():
    """Test 3.1: Create inventory item with new fields"""
    global test_inventory_id
    
    log("\n=== TEST 3.1: Create Inventory Item ===")
    
    headers = {"Authorization": f"Bearer {tu_token}"}
    payload = {
        "name": "QA Test Laptop",
        "category": "Elektronik",
        "stock": 5,
        "condition": "Baik",
        "location": "Lab Komputer",
        "code": "LAP-QA-001",
        "min_stock": 2,
        "description": "Laptop untuk testing"
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/inventory", json=payload, headers=headers, timeout=10)
        log(f"POST /inventory -> {resp.status_code}")
        
        if resp.status_code == 200:
            data = resp.json()
            test_inventory_id = data.get("id")
            if all(k in data for k in ["id", "name", "min_stock", "code"]):
                log(f"✅ PASS: Inventory created with new fields: {test_inventory_id}", "SUCCESS")
                return True
            else:
                log(f"❌ FAIL: Missing fields in response", "ERROR")
                return False
        else:
            log(f"❌ FAIL: Expected 200, got {resp.status_code} - {resp.text}", "ERROR")
            return False
    except Exception as e:
        log(f"❌ FAIL: Exception - {e}", "ERROR")
        return False

def test_10_update_inventory_stock():
    """Test 3.2: Update inventory stock to trigger low_stock"""
    log("\n=== TEST 3.2: Update Inventory Stock ===")
    
    headers = {"Authorization": f"Bearer {tu_token}"}
    payload = {"stock": 1}  # Below min_stock of 2
    
    try:
        resp = requests.patch(f"{BASE_URL}/inventory/{test_inventory_id}", 
                             json=payload, headers=headers, timeout=10)
        log(f"PATCH /inventory/{test_inventory_id} -> {resp.status_code}")
        
        if resp.status_code == 200:
            log(f"✅ PASS: Inventory stock updated", "SUCCESS")
            return True
        else:
            log(f"❌ FAIL: Expected 200, got {resp.status_code} - {resp.text}", "ERROR")
            return False
    except Exception as e:
        log(f"❌ FAIL: Exception - {e}", "ERROR")
        return False

def test_11_verify_low_stock():
    """Test 3.3: Verify low_stock flag in GET /inventory"""
    log("\n=== TEST 3.3: Verify Low Stock Flag ===")
    
    headers = {"Authorization": f"Bearer {tu_token}"}
    
    try:
        resp = requests.get(f"{BASE_URL}/inventory", headers=headers, timeout=10)
        log(f"GET /inventory -> {resp.status_code}")
        
        if resp.status_code == 200:
            items = resp.json()
            test_item = next((i for i in items if i.get("id") == test_inventory_id), None)
            
            if test_item:
                if test_item.get("low_stock") == True:
                    log(f"✅ PASS: low_stock=true when stock <= min_stock", "SUCCESS")
                    return True
                else:
                    log(f"❌ FAIL: low_stock should be true, got {test_item.get('low_stock')}", "ERROR")
                    return False
            else:
                log(f"❌ FAIL: Test item not found in inventory list", "ERROR")
                return False
        else:
            log(f"❌ FAIL: Expected 200, got {resp.status_code}", "ERROR")
            return False
    except Exception as e:
        log(f"❌ FAIL: Exception - {e}", "ERROR")
        return False

def test_12_export_inventory():
    """Test 3.4: Export inventory to Excel"""
    log("\n=== TEST 3.4: Export Inventory ===")
    
    headers = {"Authorization": f"Bearer {tu_token}"}
    
    try:
        resp = requests.get(f"{BASE_URL}/inventory/export", headers=headers, timeout=10)
        log(f"GET /inventory/export -> {resp.status_code}")
        
        if resp.status_code == 200:
            content_type = resp.headers.get("Content-Type", "")
            if "spreadsheet" in content_type or "excel" in content_type:
                log(f"✅ PASS: Inventory exported as Excel", "SUCCESS")
                return True
            elif len(resp.content) > 0:
                log(f"✅ PASS: Got binary data ({len(resp.content)} bytes)", "SUCCESS")
                return True
            else:
                log(f"❌ FAIL: Empty response", "ERROR")
                return False
        else:
            log(f"❌ FAIL: Expected 200, got {resp.status_code}", "ERROR")
            return False
    except Exception as e:
        log(f"❌ FAIL: Exception - {e}", "ERROR")
        return False

def test_13_delete_inventory():
    """Test 3.5: Delete inventory item"""
    log("\n=== TEST 3.5: Delete Inventory ===")
    
    headers = {"Authorization": f"Bearer {tu_token}"}
    
    try:
        resp = requests.delete(f"{BASE_URL}/inventory/{test_inventory_id}", 
                              headers=headers, timeout=10)
        log(f"DELETE /inventory/{test_inventory_id} -> {resp.status_code}")
        
        if resp.status_code == 200:
            log(f"✅ PASS: Inventory deleted", "SUCCESS")
            return True
        else:
            log(f"❌ FAIL: Expected 200, got {resp.status_code} - {resp.text}", "ERROR")
            return False
    except Exception as e:
        log(f"❌ FAIL: Exception - {e}", "ERROR")
        return False

# ============ TEST 4: UJIAN (EXAMS) ============
def test_14_create_exam():
    """Test 4.1: Create exam with anti-cheat settings"""
    global test_exam_id
    
    log("\n=== TEST 4.1: Create Exam ===")
    
    headers = {"Authorization": f"Bearer {guru_token}"}
    payload = {
        "title": "QA Ujian Anti-Nyontek",
        "kelas": "XI IPA 1",
        "class_id": xi_ipa_1_id,
        "questions": [
            {
                "q": "Berapa hasil 1 + 1?",
                "options": ["1", "2", "3", "4"],
                "answer": 1
            },
            {
                "q": "Berapa hasil 2 x 2?",
                "options": ["2", "3", "4", "5"],
                "answer": 2
            }
        ],
        "password": "ujian123",
        "time_limit": 0,
        "max_violations": 3
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/exams", json=payload, headers=headers, timeout=10)
        log(f"POST /exams -> {resp.status_code}")
        
        if resp.status_code == 200:
            data = resp.json()
            test_exam_id = data.get("id")
            if test_exam_id and "max_violations" in data:
                log(f"✅ PASS: Exam created with max_violations: {test_exam_id}", "SUCCESS")
                return True
            else:
                log(f"❌ FAIL: Missing fields in response", "ERROR")
                return False
        else:
            log(f"❌ FAIL: Expected 200, got {resp.status_code} - {resp.text}", "ERROR")
            return False
    except Exception as e:
        log(f"❌ FAIL: Exception - {e}", "ERROR")
        return False

def test_15_list_exams():
    """Test 4.2: List exams for class"""
    log("\n=== TEST 4.2: List Exams ===")
    
    headers = {"Authorization": f"Bearer {guru_token}"}
    
    try:
        resp = requests.get(f"{BASE_URL}/exams?class_id={xi_ipa_1_id}", 
                           headers=headers, timeout=10)
        log(f"GET /exams?class_id={xi_ipa_1_id} -> {resp.status_code}")
        
        if resp.status_code == 200:
            exams = resp.json()
            found = any(e.get("id") == test_exam_id for e in exams)
            if found:
                log(f"✅ PASS: Exam found in list", "SUCCESS")
                return True
            else:
                log(f"❌ FAIL: Exam not found in list", "ERROR")
                return False
        else:
            log(f"❌ FAIL: Expected 200, got {resp.status_code}", "ERROR")
            return False
    except Exception as e:
        log(f"❌ FAIL: Exception - {e}", "ERROR")
        return False

def test_16_start_exam_wrong_password():
    """Test 4.3: Start exam with wrong password"""
    log("\n=== TEST 4.3: Start Exam (Wrong Password) ===")
    
    headers = {"Authorization": f"Bearer {siswa_token}"}
    payload = {"password": "wrongpassword"}
    
    try:
        resp = requests.post(f"{BASE_URL}/exams/{test_exam_id}/start", 
                            json=payload, headers=headers, timeout=10)
        log(f"POST /exams/{test_exam_id}/start (wrong password) -> {resp.status_code}")
        
        if resp.status_code == 400:
            log(f"✅ PASS: Wrong password correctly rejected (400)", "SUCCESS")
            return True
        else:
            log(f"❌ FAIL: Expected 400, got {resp.status_code}", "ERROR")
            return False
    except Exception as e:
        log(f"❌ FAIL: Exception - {e}", "ERROR")
        return False

def test_17_start_exam_correct_password():
    """Test 4.4: Start exam with correct password"""
    log("\n=== TEST 4.4: Start Exam (Correct Password) ===")
    
    headers = {"Authorization": f"Bearer {siswa_token}"}
    payload = {"password": "ujian123"}
    
    try:
        resp = requests.post(f"{BASE_URL}/exams/{test_exam_id}/start", 
                            json=payload, headers=headers, timeout=10)
        log(f"POST /exams/{test_exam_id}/start (correct password) -> {resp.status_code}")
        
        if resp.status_code == 200:
            data = resp.json()
            required_fields = ["questions", "max_violations", "violations"]
            if all(f in data for f in required_fields):
                log(f"✅ PASS: Exam started, got questions and max_violations={data['max_violations']}", "SUCCESS")
                return True
            else:
                log(f"❌ FAIL: Missing fields in response", "ERROR")
                return False
        else:
            log(f"❌ FAIL: Expected 200, got {resp.status_code} - {resp.text}", "ERROR")
            return False
    except Exception as e:
        log(f"❌ FAIL: Exception - {e}", "ERROR")
        return False

def test_18_record_violations():
    """Test 4.5: Record violations and check exceeded"""
    log("\n=== TEST 4.5: Record Violations ===")
    
    headers = {"Authorization": f"Bearer {siswa_token}"}
    
    try:
        # Record 3 violations
        for i in range(3):
            resp = requests.post(f"{BASE_URL}/exams/{test_exam_id}/violation", 
                                headers=headers, timeout=10)
            log(f"POST /exams/{test_exam_id}/violation (#{i+1}) -> {resp.status_code}")
            
            if resp.status_code == 200:
                data = resp.json()
                violations = data.get("violations")
                exceeded = data.get("exceeded")
                log(f"  Violations: {violations}, Exceeded: {exceeded}")
                
                if i == 2:  # 3rd violation
                    if exceeded == True:
                        log(f"✅ PASS: exceeded=true on 3rd violation", "SUCCESS")
                        return True
                    else:
                        log(f"❌ FAIL: exceeded should be true on 3rd violation", "ERROR")
                        return False
            else:
                log(f"❌ FAIL: Expected 200, got {resp.status_code}", "ERROR")
                return False
        
        log(f"❌ FAIL: Did not reach 3rd violation", "ERROR")
        return False
    except Exception as e:
        log(f"❌ FAIL: Exception - {e}", "ERROR")
        return False

def test_19_submit_exam():
    """Test 4.6: Submit exam attempt"""
    log("\n=== TEST 4.6: Submit Exam Attempt ===")
    
    headers = {"Authorization": f"Bearer {siswa_token}"}
    payload = {
        "exam_id": test_exam_id,
        "answers": [1, 2],  # Correct answers
        "violations": 3,
        "auto_submitted": True
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/exams/attempt", 
                            json=payload, headers=headers, timeout=10)
        log(f"POST /exams/attempt -> {resp.status_code}")
        
        if resp.status_code == 200:
            data = resp.json()
            if "score" in data and "total" in data and "percent" in data:
                log(f"✅ PASS: Exam submitted, score={data['score']}/{data['total']} ({data['percent']}%)", "SUCCESS")
                return True
            else:
                log(f"❌ FAIL: Missing fields in response", "ERROR")
                return False
        else:
            log(f"❌ FAIL: Expected 200, got {resp.status_code} - {resp.text}", "ERROR")
            return False
    except Exception as e:
        log(f"❌ FAIL: Exception - {e}", "ERROR")
        return False

def test_20_cannot_restart_exam():
    """Test 4.7: Cannot restart exam after attempt"""
    log("\n=== TEST 4.7: Cannot Restart Exam ===")
    
    headers = {"Authorization": f"Bearer {siswa_token}"}
    payload = {"password": "ujian123"}
    
    try:
        resp = requests.post(f"{BASE_URL}/exams/{test_exam_id}/start", 
                            json=payload, headers=headers, timeout=10)
        log(f"POST /exams/{test_exam_id}/start (after attempt) -> {resp.status_code}")
        
        if resp.status_code == 409:
            log(f"✅ PASS: Restart correctly prevented (409)", "SUCCESS")
            return True
        else:
            log(f"❌ FAIL: Expected 409, got {resp.status_code}", "ERROR")
            return False
    except Exception as e:
        log(f"❌ FAIL: Exception - {e}", "ERROR")
        return False

def test_21_exam_results_with_violations():
    """Test 4.8: Get exam results showing violations"""
    log("\n=== TEST 4.8: Get Exam Results ===")
    
    headers = {"Authorization": f"Bearer {guru_token}"}
    
    try:
        resp = requests.get(f"{BASE_URL}/exams/{test_exam_id}/results", 
                           headers=headers, timeout=10)
        log(f"GET /exams/{test_exam_id}/results -> {resp.status_code}")
        
        if resp.status_code == 200:
            data = resp.json()
            attempts = data.get("attempts", [])
            if attempts and "violations" in attempts[0]:
                violations = attempts[0]["violations"]
                log(f"✅ PASS: Results include violations field (violations={violations})", "SUCCESS")
                return True
            else:
                log(f"❌ FAIL: No attempts or missing violations field", "ERROR")
                return False
        else:
            log(f"❌ FAIL: Expected 200, got {resp.status_code}", "ERROR")
            return False
    except Exception as e:
        log(f"❌ FAIL: Exception - {e}", "ERROR")
        return False

def test_22_delete_exam():
    """Test 4.9: Delete exam"""
    log("\n=== TEST 4.9: Delete Exam ===")
    
    headers = {"Authorization": f"Bearer {guru_token}"}
    
    try:
        resp = requests.delete(f"{BASE_URL}/exams/{test_exam_id}", 
                              headers=headers, timeout=10)
        log(f"DELETE /exams/{test_exam_id} -> {resp.status_code}")
        
        if resp.status_code == 200:
            log(f"✅ PASS: Exam deleted", "SUCCESS")
            return True
        else:
            log(f"❌ FAIL: Expected 200, got {resp.status_code} - {resp.text}", "ERROR")
            return False
    except Exception as e:
        log(f"❌ FAIL: Exception - {e}", "ERROR")
        return False

# ============ TEST 5: UPLOAD/STORAGE ============
def test_23_upload_file():
    """Test 5.1: Upload file to object storage"""
    log("\n=== TEST 5.1: Upload File ===")
    
    headers = {"Authorization": f"Bearer {super_token}"}
    
    # Create a small test image (1x1 PNG)
    png_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82'
    
    files = {"file": ("test.png", io.BytesIO(png_data), "image/png")}
    
    try:
        resp = requests.post(f"{BASE_URL}/upload", files=files, headers=headers, timeout=30)
        log(f"POST /upload -> {resp.status_code}")
        
        if resp.status_code == 200:
            data = resp.json()
            if "url" in data:
                url = data["url"]
                log(f"✅ PASS: File uploaded successfully, URL: {url}", "SUCCESS")
                return True
            else:
                log(f"❌ FAIL: No URL in response", "ERROR")
                return False
        else:
            log(f"❌ FAIL: Expected 200, got {resp.status_code} - {resp.text}", "ERROR")
            return False
    except Exception as e:
        log(f"❌ FAIL: Exception - {e}", "ERROR")
        return False

# ============ CLEANUP ============
def cleanup():
    """Clean up test data"""
    log("\n=== CLEANUP ===")
    
    headers = {"Authorization": f"Bearer {admin_demo_token}"}
    
    # Delete test class
    if test_class_id:
        try:
            resp = requests.delete(f"{BASE_URL}/classes/{test_class_id}", 
                                  headers=headers, timeout=10)
            if resp.status_code == 200:
                log(f"✅ Deleted test class: {test_class_id}")
            else:
                log(f"⚠️ Could not delete test class: {resp.status_code}", "WARN")
        except Exception as e:
            log(f"⚠️ Exception deleting test class: {e}", "WARN")
    
    log("✅ Cleanup complete")

# ============ MAIN ============
def main():
    """Run all tests"""
    log("=" * 80)
    log("SEKOLAHKU Backend Test Suite - New Features (Oct 2025) - FINAL")
    log("=" * 80)
    
    results = []
    
    # Setup
    if not setup_auth():
        log("❌ FATAL: Setup failed", "ERROR")
        sys.exit(1)
    
    if not find_xi_ipa_1():
        log("❌ FATAL: Cannot find XI IPA 1", "ERROR")
        sys.exit(1)
    
    if not find_demo_students():
        log("❌ FATAL: Cannot find demo students", "ERROR")
        sys.exit(1)
    
    # Test 1: Bendahara
    results.append(("1.1 Set Treasurer", test_1_set_treasurer()))
    results.append(("1.2 Verify Treasurer in Class", test_2_verify_treasurer_in_class()))
    results.append(("1.3 Bendahara Can Add Kas", test_3_bendahara_can_manage_kas()))
    results.append(("1.4 Non-Bendahara Cannot Add Kas", test_4_non_bendahara_cannot_add_kas()))
    results.append(("1.5 Remove Treasurer", test_5_remove_treasurer()))
    results.append(("1.6 Non-Ketua Cannot Set Treasurer", test_6_non_ketua_cannot_set_treasurer()))
    
    # Test 2: Salin BPH
    results.append(("2.1 Create Source BPH", test_7_create_source_bph()))
    results.append(("2.2 Copy BPH on Class Creation", test_8_copy_bph_on_class_creation()))
    
    # Test 3: Inventory
    results.append(("3.1 Create Inventory", test_9_create_inventory()))
    results.append(("3.2 Update Inventory Stock", test_10_update_inventory_stock()))
    results.append(("3.3 Verify Low Stock", test_11_verify_low_stock()))
    results.append(("3.4 Export Inventory", test_12_export_inventory()))
    results.append(("3.5 Delete Inventory", test_13_delete_inventory()))
    
    # Test 4: Ujian
    results.append(("4.1 Create Exam", test_14_create_exam()))
    results.append(("4.2 List Exams", test_15_list_exams()))
    results.append(("4.3 Start Exam (Wrong Password)", test_16_start_exam_wrong_password()))
    results.append(("4.4 Start Exam (Correct Password)", test_17_start_exam_correct_password()))
    results.append(("4.5 Record Violations", test_18_record_violations()))
    results.append(("4.6 Submit Exam", test_19_submit_exam()))
    results.append(("4.7 Cannot Restart Exam", test_20_cannot_restart_exam()))
    results.append(("4.8 Get Exam Results", test_21_exam_results_with_violations()))
    results.append(("4.9 Delete Exam", test_22_delete_exam()))
    
    # Test 5: Upload
    results.append(("5.1 Upload File", test_23_upload_file()))
    
    # Cleanup
    cleanup()
    
    # Summary
    log("\n" + "=" * 80)
    log("TEST SUMMARY")
    log("=" * 80)
    
    passed = sum(1 for _, r in results if r == True)
    failed = sum(1 for _, r in results if r == False)
    skipped = sum(1 for _, r in results if r is None)
    total = len(results)
    
    for name, result in results:
        if result == True:
            log(f"✅ {name}", "SUCCESS")
        elif result == False:
            log(f"❌ {name}", "ERROR")
        else:
            log(f"⚠️ {name} (SKIPPED)", "WARN")
    
    log("\n" + "=" * 80)
    log(f"TOTAL: {total} tests")
    log(f"PASSED: {passed}")
    log(f"FAILED: {failed}")
    log(f"SKIPPED: {skipped}")
    log("=" * 80)
    
    if failed > 0:
        sys.exit(1)
    else:
        sys.exit(0)

if __name__ == "__main__":
    main()
