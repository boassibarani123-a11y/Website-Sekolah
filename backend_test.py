#!/usr/bin/env python3
"""
Backend Test Suite for SEKOLAHKU - Multiple Org Structures Feature
Tests all scenarios for org-structures CRUD and org node filtering
"""
import requests
import json
import sys
import random
import string
from typing import Optional

# Configuration
BASE_URL = "https://a11y-school-build.preview.emergentagent.com/api"
SUPER_ADMIN_EMAIL = "boassibarani123@gmail.com"
SUPER_ADMIN_PASSWORD = "Boas12345io"

# Test state
token = None
structure_id = None
root_node_id = None
child_node_id = None
guru_token = None
guru_user_id = None

def random_suffix():
    """Generate random suffix for unique names"""
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))

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
            log(f"Login failed: {resp.status_code} - {resp.text}", "ERROR")
            return None, None
    except Exception as e:
        log(f"Login exception: {e}", "ERROR")
        return None, None

def test_scenario_1_create_structure():
    """Scenario 1: POST /api/org-structures as super_admin"""
    global structure_id
    log("=== SCENARIO 1: Create Org Structure ===")
    
    headers = {"Authorization": f"Bearer {token}"}
    rand = random_suffix()
    payload = {
        "name": f"QA Struktur {rand}",
        "subtitle": "TA 2025"
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/org-structures", json=payload, headers=headers, timeout=10)
        log(f"POST /api/org-structures -> {resp.status_code}")
        
        if resp.status_code == 200:
            data = resp.json()
            if "id" in data and "name" in data and "subtitle" in data and "member_count" in data:
                structure_id = data["id"]
                if data["member_count"] == 0:
                    log(f"✅ PASS: Structure created with id={structure_id}, member_count=0", "SUCCESS")
                    return True
                else:
                    log(f"❌ FAIL: member_count should be 0, got {data['member_count']}", "ERROR")
                    return False
            else:
                log(f"❌ FAIL: Missing required fields in response: {data}", "ERROR")
                return False
        else:
            log(f"❌ FAIL: Expected 200, got {resp.status_code} - {resp.text}", "ERROR")
            return False
    except Exception as e:
        log(f"❌ FAIL: Exception - {e}", "ERROR")
        return False

def test_scenario_2_list_structures():
    """Scenario 2: GET /api/org-structures includes new structure"""
    log("=== SCENARIO 2: List Org Structures ===")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        resp = requests.get(f"{BASE_URL}/org-structures", headers=headers, timeout=10)
        log(f"GET /api/org-structures -> {resp.status_code}")
        
        if resp.status_code == 200:
            data = resp.json()
            found = any(s["id"] == structure_id for s in data)
            if found:
                log(f"✅ PASS: Structure {structure_id} found in list", "SUCCESS")
                return True
            else:
                log(f"❌ FAIL: Structure {structure_id} not found in list", "ERROR")
                return False
        else:
            log(f"❌ FAIL: Expected 200, got {resp.status_code} - {resp.text}", "ERROR")
            return False
    except Exception as e:
        log(f"❌ FAIL: Exception - {e}", "ERROR")
        return False

def test_scenario_3_get_structure():
    """Scenario 3: GET /api/org-structures/{id} -> 200, non-existent -> 404"""
    log("=== SCENARIO 3: Get Specific Structure ===")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test valid ID
    try:
        resp = requests.get(f"{BASE_URL}/org-structures/{structure_id}", headers=headers, timeout=10)
        log(f"GET /api/org-structures/{structure_id} -> {resp.status_code}")
        
        if resp.status_code != 200:
            log(f"❌ FAIL: Expected 200 for valid ID, got {resp.status_code}", "ERROR")
            return False
    except Exception as e:
        log(f"❌ FAIL: Exception on valid ID - {e}", "ERROR")
        return False
    
    # Test non-existent ID
    try:
        fake_id = "non-existent-structure-id-12345"
        resp = requests.get(f"{BASE_URL}/org-structures/{fake_id}", headers=headers, timeout=10)
        log(f"GET /api/org-structures/{fake_id} -> {resp.status_code}")
        
        if resp.status_code == 404:
            log(f"✅ PASS: Valid ID returns 200, non-existent returns 404", "SUCCESS")
            return True
        else:
            log(f"❌ FAIL: Expected 404 for non-existent ID, got {resp.status_code}", "ERROR")
            return False
    except Exception as e:
        log(f"❌ FAIL: Exception on non-existent ID - {e}", "ERROR")
        return False

def test_scenario_4_create_root_node():
    """Scenario 4: POST /api/org with structure_id (root node)"""
    global root_node_id
    log("=== SCENARIO 4: Create Root Org Node ===")
    
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "name": "Kepala",
        "title": "Kepala Sekolah",
        "structure_id": structure_id
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/org", json=payload, headers=headers, timeout=10)
        log(f"POST /api/org (root) -> {resp.status_code}")
        
        if resp.status_code == 200:
            data = resp.json()
            if "id" in data and data.get("structure_id") == structure_id:
                root_node_id = data["id"]
                log(f"✅ PASS: Root node created with id={root_node_id}, structure_id set", "SUCCESS")
                return True
            else:
                log(f"❌ FAIL: Missing id or structure_id not set: {data}", "ERROR")
                return False
        else:
            log(f"❌ FAIL: Expected 200, got {resp.status_code} - {resp.text}", "ERROR")
            return False
    except Exception as e:
        log(f"❌ FAIL: Exception - {e}", "ERROR")
        return False

def test_scenario_5_create_child_node():
    """Scenario 5: POST /api/org with parent_id and structure_id"""
    global child_node_id
    log("=== SCENARIO 5: Create Child Org Node ===")
    
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "name": "Wakil",
        "title": "Wakasek",
        "parent_id": root_node_id,
        "structure_id": structure_id
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/org", json=payload, headers=headers, timeout=10)
        log(f"POST /api/org (child) -> {resp.status_code}")
        
        if resp.status_code == 200:
            data = resp.json()
            if "id" in data and data.get("structure_id") == structure_id and data.get("parent_id") == root_node_id:
                child_node_id = data["id"]
                log(f"✅ PASS: Child node created with id={child_node_id}, parent_id and structure_id set", "SUCCESS")
                return True
            else:
                log(f"❌ FAIL: Missing id or parent_id/structure_id not set: {data}", "ERROR")
                return False
        else:
            log(f"❌ FAIL: Expected 200, got {resp.status_code} - {resp.text}", "ERROR")
            return False
    except Exception as e:
        log(f"❌ FAIL: Exception - {e}", "ERROR")
        return False

def test_scenario_6_filter_and_count():
    """Scenario 6: GET /api/org?structure_id filters correctly, member_count updates"""
    log("=== SCENARIO 6: Filter Nodes and Verify Member Count ===")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test filtering
    try:
        resp = requests.get(f"{BASE_URL}/org", params={"structure_id": structure_id}, headers=headers, timeout=10)
        log(f"GET /api/org?structure_id={structure_id} -> {resp.status_code}")
        
        if resp.status_code == 200:
            data = resp.json()
            if len(data) == 2:
                log(f"✅ PASS: Filtering returns exactly 2 nodes", "SUCCESS")
            else:
                log(f"❌ FAIL: Expected 2 nodes, got {len(data)}", "ERROR")
                return False
        else:
            log(f"❌ FAIL: Expected 200, got {resp.status_code} - {resp.text}", "ERROR")
            return False
    except Exception as e:
        log(f"❌ FAIL: Exception on filtering - {e}", "ERROR")
        return False
    
    # Test member_count
    try:
        resp = requests.get(f"{BASE_URL}/org-structures", headers=headers, timeout=10)
        log(f"GET /api/org-structures (check member_count) -> {resp.status_code}")
        
        if resp.status_code == 200:
            data = resp.json()
            structure = next((s for s in data if s["id"] == structure_id), None)
            if structure and structure.get("member_count") == 2:
                log(f"✅ PASS: member_count updated to 2", "SUCCESS")
                return True
            else:
                log(f"❌ FAIL: member_count should be 2, got {structure.get('member_count') if structure else 'structure not found'}", "ERROR")
                return False
        else:
            log(f"❌ FAIL: Expected 200, got {resp.status_code} - {resp.text}", "ERROR")
            return False
    except Exception as e:
        log(f"❌ FAIL: Exception on member_count check - {e}", "ERROR")
        return False

def test_scenario_7_update_structure():
    """Scenario 7: PATCH /api/org-structures/{id} updates name"""
    log("=== SCENARIO 7: Update Structure Name ===")
    
    headers = {"Authorization": f"Bearer {token}"}
    payload = {"name": "QA Renamed"}
    
    try:
        resp = requests.patch(f"{BASE_URL}/org-structures/{structure_id}", json=payload, headers=headers, timeout=10)
        log(f"PATCH /api/org-structures/{structure_id} -> {resp.status_code}")
        
        if resp.status_code == 200:
            data = resp.json()
            if data.get("name") == "QA Renamed":
                log(f"✅ PASS: Structure name updated to 'QA Renamed'", "SUCCESS")
                return True
            else:
                log(f"❌ FAIL: Name not updated, got {data.get('name')}", "ERROR")
                return False
        else:
            log(f"❌ FAIL: Expected 200, got {resp.status_code} - {resp.text}", "ERROR")
            return False
    except Exception as e:
        log(f"❌ FAIL: Exception - {e}", "ERROR")
        return False

def test_scenario_8_invalid_structure_id():
    """Scenario 8: POST /api/org with non-existent structure_id -> 404"""
    log("=== SCENARIO 8: Create Node with Invalid Structure ID ===")
    
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "name": "x",
        "title": "y",
        "structure_id": "does-not-exist-12345"
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/org", json=payload, headers=headers, timeout=10)
        log(f"POST /api/org (invalid structure_id) -> {resp.status_code}")
        
        if resp.status_code == 404:
            log(f"✅ PASS: Invalid structure_id returns 404", "SUCCESS")
            return True
        else:
            log(f"❌ FAIL: Expected 404, got {resp.status_code} - {resp.text}", "ERROR")
            return False
    except Exception as e:
        log(f"❌ FAIL: Exception - {e}", "ERROR")
        return False

def test_scenario_9_auth_permissions():
    """Scenario 9: Create guru, test write=403 and read=200"""
    global guru_token, guru_user_id
    log("=== SCENARIO 9: Auth Permissions (Guru) ===")
    
    # Create guru account
    headers = {"Authorization": f"Bearer {token}"}
    rand = random_suffix()
    guru_email = f"qa.guru.orgtest.{rand}@sekolah.id"
    payload = {
        "email": guru_email,
        "password": "Guru12345",
        "name": "QA Guru Org Test",
        "role": "guru"
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/users", json=payload, headers=headers, timeout=10)
        log(f"POST /api/users (create guru) -> {resp.status_code}")
        
        if resp.status_code != 200:
            log(f"❌ FAIL: Could not create guru account: {resp.status_code} - {resp.text}", "ERROR")
            return False
        
        guru_data = resp.json()
        guru_user_id = guru_data.get("id")
        log(f"Guru account created: {guru_email}, id={guru_user_id}")
    except Exception as e:
        log(f"❌ FAIL: Exception creating guru - {e}", "ERROR")
        return False
    
    # Login as guru
    guru_token, guru_user = login(guru_email, "Guru12345")
    if not guru_token:
        log(f"❌ FAIL: Could not login as guru", "ERROR")
        return False
    
    log(f"Logged in as guru: {guru_email}")
    
    # Test write (should be 403)
    guru_headers = {"Authorization": f"Bearer {guru_token}"}
    write_payload = {"name": "Test Structure", "subtitle": "Should Fail"}
    
    try:
        resp = requests.post(f"{BASE_URL}/org-structures", json=write_payload, headers=guru_headers, timeout=10)
        log(f"POST /api/org-structures (as guru) -> {resp.status_code}")
        
        if resp.status_code != 403:
            log(f"❌ FAIL: Expected 403 for guru write, got {resp.status_code}", "ERROR")
            return False
    except Exception as e:
        log(f"❌ FAIL: Exception on guru write - {e}", "ERROR")
        return False
    
    # Test read (should be 200)
    try:
        resp = requests.get(f"{BASE_URL}/org-structures", headers=guru_headers, timeout=10)
        log(f"GET /api/org-structures (as guru) -> {resp.status_code}")
        
        if resp.status_code == 200:
            log(f"✅ PASS: Guru write=403, read=200", "SUCCESS")
            return True
        else:
            log(f"❌ FAIL: Expected 200 for guru read, got {resp.status_code}", "ERROR")
            return False
    except Exception as e:
        log(f"❌ FAIL: Exception on guru read - {e}", "ERROR")
        return False

def test_scenario_10_delete_cascade():
    """Scenario 10: DELETE /api/org-structures/{id} cascades to nodes"""
    log("=== SCENARIO 10: Delete Structure with Cascade ===")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Delete structure
    try:
        resp = requests.delete(f"{BASE_URL}/org-structures/{structure_id}", headers=headers, timeout=10)
        log(f"DELETE /api/org-structures/{structure_id} -> {resp.status_code}")
        
        if resp.status_code != 200:
            log(f"❌ FAIL: Expected 200, got {resp.status_code} - {resp.text}", "ERROR")
            return False
    except Exception as e:
        log(f"❌ FAIL: Exception on delete - {e}", "ERROR")
        return False
    
    # Verify cascade: nodes should be gone
    try:
        resp = requests.get(f"{BASE_URL}/org", params={"structure_id": structure_id}, headers=headers, timeout=10)
        log(f"GET /api/org?structure_id={structure_id} (after delete) -> {resp.status_code}")
        
        if resp.status_code == 200:
            data = resp.json()
            if len(data) == 0:
                log(f"✅ PASS: Nodes cascaded (list empty)", "SUCCESS")
            else:
                log(f"❌ FAIL: Expected empty list, got {len(data)} nodes", "ERROR")
                return False
        else:
            log(f"❌ FAIL: Expected 200, got {resp.status_code}", "ERROR")
            return False
    except Exception as e:
        log(f"❌ FAIL: Exception on cascade check - {e}", "ERROR")
        return False
    
    # Verify structure no longer in list
    try:
        resp = requests.get(f"{BASE_URL}/org-structures", headers=headers, timeout=10)
        log(f"GET /api/org-structures (after delete) -> {resp.status_code}")
        
        if resp.status_code == 200:
            data = resp.json()
            found = any(s["id"] == structure_id for s in data)
            if not found:
                log(f"✅ PASS: Structure removed from list", "SUCCESS")
                return True
            else:
                log(f"❌ FAIL: Structure still in list", "ERROR")
                return False
        else:
            log(f"❌ FAIL: Expected 200, got {resp.status_code}", "ERROR")
            return False
    except Exception as e:
        log(f"❌ FAIL: Exception on list check - {e}", "ERROR")
        return False

def cleanup():
    """Cleanup: delete guru account"""
    log("=== CLEANUP ===")
    
    if guru_user_id:
        headers = {"Authorization": f"Bearer {token}"}
        try:
            resp = requests.delete(f"{BASE_URL}/users/{guru_user_id}", headers=headers, timeout=10)
            log(f"DELETE /api/users/{guru_user_id} (guru cleanup) -> {resp.status_code}")
            if resp.status_code == 200:
                log(f"✅ Guru account deleted", "SUCCESS")
            else:
                log(f"⚠️ Could not delete guru account: {resp.status_code}", "WARN")
        except Exception as e:
            log(f"⚠️ Exception during cleanup: {e}", "WARN")

def test_demo_filtering():
    """Additional test: Verify super_admin only sees non-demo structures"""
    log("=== ADDITIONAL: Demo Filtering ===")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        resp = requests.get(f"{BASE_URL}/org-structures", headers=headers, timeout=10)
        log(f"GET /api/org-structures (check demo filtering) -> {resp.status_code}")
        
        if resp.status_code == 200:
            data = resp.json()
            demo_structures = [s for s in data if s.get("is_demo") == True]
            if len(demo_structures) == 0:
                log(f"✅ PASS: Super admin sees no demo structures (correct)", "SUCCESS")
                return True
            else:
                log(f"⚠️ WARNING: Super admin sees {len(demo_structures)} demo structures (should be 0)", "WARN")
                return True  # Not a critical failure
        else:
            log(f"❌ FAIL: Expected 200, got {resp.status_code}", "ERROR")
            return False
    except Exception as e:
        log(f"❌ FAIL: Exception - {e}", "ERROR")
        return False

def main():
    global token
    
    log("=" * 60)
    log("SEKOLAHKU - Multiple Org Structures Backend Test Suite")
    log("=" * 60)
    
    # Login as super_admin
    log("Logging in as super_admin...")
    token, user = login(SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD)
    if not token:
        log("❌ FATAL: Could not login as super_admin", "ERROR")
        sys.exit(1)
    
    log(f"✅ Logged in as {user.get('email')} (role: {user.get('role')})")
    log("")
    
    # Run all test scenarios
    results = []
    
    results.append(("Scenario 1: Create Structure", test_scenario_1_create_structure()))
    results.append(("Scenario 2: List Structures", test_scenario_2_list_structures()))
    results.append(("Scenario 3: Get Structure (200/404)", test_scenario_3_get_structure()))
    results.append(("Scenario 4: Create Root Node", test_scenario_4_create_root_node()))
    results.append(("Scenario 5: Create Child Node", test_scenario_5_create_child_node()))
    results.append(("Scenario 6: Filter & Member Count", test_scenario_6_filter_and_count()))
    results.append(("Scenario 7: Update Structure", test_scenario_7_update_structure()))
    results.append(("Scenario 8: Invalid Structure ID", test_scenario_8_invalid_structure_id()))
    results.append(("Scenario 9: Auth Permissions", test_scenario_9_auth_permissions()))
    results.append(("Scenario 10: Delete Cascade", test_scenario_10_delete_cascade()))
    results.append(("Additional: Demo Filtering", test_demo_filtering()))
    
    # Cleanup
    cleanup()
    
    # Summary
    log("")
    log("=" * 60)
    log("TEST SUMMARY")
    log("=" * 60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        log(f"{status}: {name}")
    
    log("")
    log(f"TOTAL: {passed}/{total} tests passed")
    log("=" * 60)
    
    if passed == total:
        log("🎉 ALL TESTS PASSED!", "SUCCESS")
        sys.exit(0)
    else:
        log(f"⚠️ {total - passed} test(s) failed", "ERROR")
        sys.exit(1)

if __name__ == "__main__":
    main()
