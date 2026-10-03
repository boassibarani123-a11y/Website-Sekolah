#!/usr/bin/env python3
"""
Backend Test Suite for SEKOLAHKU - Login Flow Verification (Post-Import)
Tests auth endpoints and basic health after fresh GitHub import (main4)
"""
import requests
import json
import sys
from typing import Optional

# Configuration - Use external URL from frontend/.env
BASE_URL = "https://19a1cb33-8c61-4225-aebb-64c71ef334df.preview.emergentagent.com/api"
SUPER_ADMIN_EMAIL = "boassibarani123@gmail.com"
SUPER_ADMIN_PASSWORD = "Boas12345io"
DEMO_ADMIN_EMAIL = "admin.demo@sekolahku.id"
DEMO_ADMIN_PASSWORD = "Demo12345"

# Test state
super_admin_token = None
demo_admin_token = None

def log(msg: str, level: str = "INFO"):
    """Log test messages"""
    print(f"[{level}] {msg}")

def test_1_super_admin_login():
    """Test 1: POST /api/auth/login with super_admin credentials"""
    global super_admin_token
    log("=== TEST 1: Super Admin Login ===")
    
    payload = {
        "email": SUPER_ADMIN_EMAIL,
        "password": SUPER_ADMIN_PASSWORD
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/auth/login", json=payload, timeout=10)
        log(f"POST /api/auth/login (super_admin) -> {resp.status_code}")
        
        if resp.status_code == 200:
            data = resp.json()
            if "token" in data and "user" in data:
                super_admin_token = data["token"]
                user = data["user"]
                if user.get("email") == SUPER_ADMIN_EMAIL.lower() and user.get("role") == "super_admin":
                    log(f"✅ PASS: Super admin login successful, token received, user object correct (email={user.get('email')}, role={user.get('role')})", "SUCCESS")
                    return True
                else:
                    log(f"❌ FAIL: User object incorrect: {user}", "ERROR")
                    return False
            else:
                log(f"❌ FAIL: Missing token or user in response: {data}", "ERROR")
                return False
        else:
            log(f"❌ FAIL: Expected 200, got {resp.status_code} - {resp.text}", "ERROR")
            return False
    except Exception as e:
        log(f"❌ FAIL: Exception - {e}", "ERROR")
        return False

def test_2_auth_me():
    """Test 2: GET /api/auth/me with Bearer token"""
    log("=== TEST 2: Auth Me (Current User) ===")
    
    if not super_admin_token:
        log("❌ FAIL: No token available (test 1 must pass first)", "ERROR")
        return False
    
    headers = {"Authorization": f"Bearer {super_admin_token}"}
    
    try:
        resp = requests.get(f"{BASE_URL}/auth/me", headers=headers, timeout=10)
        log(f"GET /api/auth/me -> {resp.status_code}")
        
        if resp.status_code == 200:
            data = resp.json()
            if data.get("email") == SUPER_ADMIN_EMAIL.lower() and data.get("role") == "super_admin":
                log(f"✅ PASS: /auth/me returns current user correctly (email={data.get('email')}, role={data.get('role')})", "SUCCESS")
                return True
            else:
                log(f"❌ FAIL: User data incorrect: {data}", "ERROR")
                return False
        else:
            log(f"❌ FAIL: Expected 200, got {resp.status_code} - {resp.text}", "ERROR")
            return False
    except Exception as e:
        log(f"❌ FAIL: Exception - {e}", "ERROR")
        return False

def test_3_demo_admin_login():
    """Test 3: POST /api/auth/login with demo admin account"""
    global demo_admin_token
    log("=== TEST 3: Demo Admin Login ===")
    
    payload = {
        "email": DEMO_ADMIN_EMAIL,
        "password": DEMO_ADMIN_PASSWORD
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/auth/login", json=payload, timeout=10)
        log(f"POST /api/auth/login (demo admin) -> {resp.status_code}")
        
        if resp.status_code == 200:
            data = resp.json()
            if "token" in data and "user" in data:
                demo_admin_token = data["token"]
                user = data["user"]
                log(f"✅ PASS: Demo admin login successful, token received (email={user.get('email')}, role={user.get('role')})", "SUCCESS")
                return True
            else:
                log(f"❌ FAIL: Missing token or user in response: {data}", "ERROR")
                return False
        else:
            log(f"❌ FAIL: Expected 200, got {resp.status_code} - {resp.text}", "ERROR")
            return False
    except Exception as e:
        log(f"❌ FAIL: Exception - {e}", "ERROR")
        return False

def test_4_wrong_password():
    """Test 4: POST /api/auth/login with wrong password -> expect 401"""
    log("=== TEST 4: Login with Wrong Password (Negative Test) ===")
    
    payload = {
        "email": SUPER_ADMIN_EMAIL,
        "password": "WrongPassword123"
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/auth/login", json=payload, timeout=10)
        log(f"POST /api/auth/login (wrong password) -> {resp.status_code}")
        
        if resp.status_code == 401:
            data = resp.json()
            if "detail" in data and "Email atau password salah" in data["detail"]:
                log(f"✅ PASS: Wrong password returns 401 with correct error message: '{data['detail']}'", "SUCCESS")
                return True
            else:
                log(f"⚠️ PARTIAL PASS: Returns 401 but error message differs: {data}", "WARN")
                return True  # Still pass since 401 is correct
        else:
            log(f"❌ FAIL: Expected 401, got {resp.status_code} - {resp.text}", "ERROR")
            return False
    except Exception as e:
        log(f"❌ FAIL: Exception - {e}", "ERROR")
        return False

def test_5_health_check_settings():
    """Test 5a: GET /api/settings (public endpoint)"""
    log("=== TEST 5a: Health Check - Settings (Public) ===")
    
    try:
        resp = requests.get(f"{BASE_URL}/settings", timeout=10)
        log(f"GET /api/settings -> {resp.status_code}")
        
        if resp.status_code == 200:
            data = resp.json()
            if "school_name" in data:
                log(f"✅ PASS: /api/settings returns 200 with school data (school_name={data.get('school_name')})", "SUCCESS")
                return True
            else:
                log(f"❌ FAIL: Response missing expected fields: {data}", "ERROR")
                return False
        else:
            log(f"❌ FAIL: Expected 200, got {resp.status_code} - {resp.text}", "ERROR")
            return False
    except Exception as e:
        log(f"❌ FAIL: Exception - {e}", "ERROR")
        return False

def test_6_health_check_announcements():
    """Test 5b: GET /api/announcements (requires auth)"""
    log("=== TEST 5b: Health Check - Announcements ===")
    
    if not super_admin_token:
        log("❌ FAIL: No token available", "ERROR")
        return False
    
    headers = {"Authorization": f"Bearer {super_admin_token}"}
    
    try:
        resp = requests.get(f"{BASE_URL}/announcements", headers=headers, timeout=10)
        log(f"GET /api/announcements -> {resp.status_code}")
        
        if resp.status_code == 200:
            log(f"✅ PASS: /api/announcements returns 200", "SUCCESS")
            return True
        else:
            log(f"❌ FAIL: Expected 200, got {resp.status_code} - {resp.text}", "ERROR")
            return False
    except Exception as e:
        log(f"❌ FAIL: Exception - {e}", "ERROR")
        return False

def test_7_health_check_classes():
    """Test 5c: GET /api/classes (requires auth)"""
    log("=== TEST 5c: Health Check - Classes ===")
    
    if not super_admin_token:
        log("❌ FAIL: No token available", "ERROR")
        return False
    
    headers = {"Authorization": f"Bearer {super_admin_token}"}
    
    try:
        resp = requests.get(f"{BASE_URL}/classes", headers=headers, timeout=10)
        log(f"GET /api/classes -> {resp.status_code}")
        
        if resp.status_code == 200:
            log(f"✅ PASS: /api/classes returns 200", "SUCCESS")
            return True
        else:
            log(f"❌ FAIL: Expected 200, got {resp.status_code} - {resp.text}", "ERROR")
            return False
    except Exception as e:
        log(f"❌ FAIL: Exception - {e}", "ERROR")
        return False

def test_8_health_check_stats():
    """Test 5d: GET /api/stats (requires auth)"""
    log("=== TEST 5d: Health Check - Stats ===")
    
    if not super_admin_token:
        log("❌ FAIL: No token available", "ERROR")
        return False
    
    headers = {"Authorization": f"Bearer {super_admin_token}"}
    
    try:
        resp = requests.get(f"{BASE_URL}/stats", headers=headers, timeout=10)
        log(f"GET /api/stats -> {resp.status_code}")
        
        if resp.status_code == 200:
            log(f"✅ PASS: /api/stats returns 200", "SUCCESS")
            return True
        else:
            log(f"❌ FAIL: Expected 200, got {resp.status_code} - {resp.text}", "ERROR")
            return False
    except Exception as e:
        log(f"❌ FAIL: Exception - {e}", "ERROR")
        return False

def test_9_health_check_notifications():
    """Test 5e: GET /api/notifications (requires auth)"""
    log("=== TEST 5e: Health Check - Notifications ===")
    
    if not super_admin_token:
        log("❌ FAIL: No token available", "ERROR")
        return False
    
    headers = {"Authorization": f"Bearer {super_admin_token}"}
    
    try:
        resp = requests.get(f"{BASE_URL}/notifications", headers=headers, timeout=10)
        log(f"GET /api/notifications -> {resp.status_code}")
        
        if resp.status_code == 200:
            log(f"✅ PASS: /api/notifications returns 200", "SUCCESS")
            return True
        else:
            log(f"❌ FAIL: Expected 200, got {resp.status_code} - {resp.text}", "ERROR")
            return False
    except Exception as e:
        log(f"❌ FAIL: Exception - {e}", "ERROR")
        return False

def test_10_health_check_attendance_stats():
    """Test 5f: GET /api/attendance/stats (requires auth)"""
    log("=== TEST 5f: Health Check - Attendance Stats ===")
    
    if not super_admin_token:
        log("❌ FAIL: No token available", "ERROR")
        return False
    
    headers = {"Authorization": f"Bearer {super_admin_token}"}
    
    try:
        resp = requests.get(f"{BASE_URL}/attendance/stats", headers=headers, timeout=10)
        log(f"GET /api/attendance/stats -> {resp.status_code}")
        
        if resp.status_code == 200:
            log(f"✅ PASS: /api/attendance/stats returns 200", "SUCCESS")
            return True
        else:
            log(f"❌ FAIL: Expected 200, got {resp.status_code} - {resp.text}", "ERROR")
            return False
    except Exception as e:
        log(f"❌ FAIL: Exception - {e}", "ERROR")
        return False

def main():
    log("=" * 70)
    log("SEKOLAHKU - Login Flow Verification (Post-Import main4)")
    log("=" * 70)
    log(f"Backend URL: {BASE_URL}")
    log("")
    
    # Run all tests
    results = []
    
    results.append(("Test 1: Super Admin Login", test_1_super_admin_login()))
    results.append(("Test 2: Auth Me (Current User)", test_2_auth_me()))
    results.append(("Test 3: Demo Admin Login", test_3_demo_admin_login()))
    results.append(("Test 4: Wrong Password (Negative)", test_4_wrong_password()))
    results.append(("Test 5a: Health - Settings (Public)", test_5_health_check_settings()))
    results.append(("Test 5b: Health - Announcements", test_6_health_check_announcements()))
    results.append(("Test 5c: Health - Classes", test_7_health_check_classes()))
    results.append(("Test 5d: Health - Stats", test_8_health_check_stats()))
    results.append(("Test 5e: Health - Notifications", test_9_health_check_notifications()))
    results.append(("Test 5f: Health - Attendance Stats", test_10_health_check_attendance_stats()))
    
    # Summary
    log("")
    log("=" * 70)
    log("TEST SUMMARY")
    log("=" * 70)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        log(f"{status}: {name}")
    
    log("")
    log(f"TOTAL: {passed}/{total} tests passed")
    log("=" * 70)
    
    if passed == total:
        log("🎉 ALL TESTS PASSED - LOGIN FLOW WORKING!", "SUCCESS")
        sys.exit(0)
    else:
        log(f"⚠️ {total - passed} test(s) failed", "ERROR")
        sys.exit(1)

if __name__ == "__main__":
    main()
