#!/usr/bin/env python3
"""
Smart Library (Perpustakaan Pintar) Backend Test Suite
Tests all library endpoints with demo accounts (isolated sandbox)
"""
import requests
import json
import time
from typing import Optional

# Base URL from frontend/.env
BASE_URL = "https://education-site-9.preview.emergentagent.com/api"

# Demo credentials (is_demo=True, isolated sandbox)
ADMIN_PERPUS = {"email": "perpus.demo@sekolahku.id", "password": "Demo12345"}
SISWA = {"email": "siswa.demo@sekolahku.id", "password": "Demo12345"}

# Test state
admin_token = None
siswa_token = None
test_book_id = None
test_loan_id = None
test_reservation_id = None
created_test_data = []

def login(creds: dict) -> str:
    """Login and return token"""
    resp = requests.post(f"{BASE_URL}/auth/login", json=creds)
    assert resp.status_code == 200, f"Login failed: {resp.status_code} {resp.text}"
    data = resp.json()
    assert "token" in data, "No token in login response"
    return data["token"]

def headers(token: str) -> dict:
    """Return auth headers"""
    return {"Authorization": f"Bearer {token}"}

def test_scenario_1_get_books():
    """Scenario 1: GET /api/books returns 8 seeded books, test search & filters"""
    print("\n=== SCENARIO 1: GET /api/books (list, search, filter) ===")
    
    # 1.1: Get all books (any auth)
    resp = requests.get(f"{BASE_URL}/books", headers=headers(siswa_token))
    assert resp.status_code == 200, f"GET /books failed: {resp.status_code} {resp.text}"
    books = resp.json()
    assert isinstance(books, list), "Books should be a list"
    assert len(books) == 8, f"Expected 8 seeded books, got {len(books)}"
    print(f"✅ 1.1: GET /api/books returns {len(books)} books")
    
    # 1.2: Search ?q=Laskar
    resp = requests.get(f"{BASE_URL}/books?q=Laskar", headers=headers(siswa_token))
    assert resp.status_code == 200, f"Search failed: {resp.status_code}"
    results = resp.json()
    assert len(results) >= 1, "Should find 'Laskar Pelangi'"
    assert any("Laskar" in b["title"] for b in results), "Laskar Pelangi not in search results"
    print(f"✅ 1.2: Search ?q=Laskar returns {len(results)} book(s)")
    
    # 1.3: Filter ?category=Novel
    resp = requests.get(f"{BASE_URL}/books?category=Novel", headers=headers(siswa_token))
    assert resp.status_code == 200, f"Category filter failed: {resp.status_code}"
    novels = resp.json()
    assert len(novels) >= 2, f"Expected at least 2 novels, got {len(novels)}"
    assert all(b["category"] == "Novel" for b in novels), "All results should be Novel category"
    print(f"✅ 1.3: Filter ?category=Novel returns {len(novels)} book(s)")
    
    # 1.4: Filter ?available=true
    resp = requests.get(f"{BASE_URL}/books?available=true", headers=headers(siswa_token))
    assert resp.status_code == 200, f"Available filter failed: {resp.status_code}"
    available = resp.json()
    assert len(available) >= 1, "Should have available books"
    assert all(b["available_copies"] > 0 for b in available), "All should have available_copies > 0"
    print(f"✅ 1.4: Filter ?available=true returns {len(available)} book(s)")

def test_scenario_2_get_categories_and_config():
    """Scenario 2: GET /api/books/categories and /api/library/config"""
    print("\n=== SCENARIO 2: GET categories & config ===")
    
    # 2.1: GET /api/books/categories
    resp = requests.get(f"{BASE_URL}/books/categories", headers=headers(siswa_token))
    assert resp.status_code == 200, f"GET categories failed: {resp.status_code}"
    cats = resp.json()
    assert isinstance(cats, list), "Categories should be a list"
    assert len(cats) >= 4, f"Expected at least 4 categories, got {len(cats)}"
    print(f"✅ 2.1: GET /api/books/categories returns {len(cats)} categories: {cats}")
    
    # 2.2: GET /api/library/config
    resp = requests.get(f"{BASE_URL}/library/config", headers=headers(siswa_token))
    assert resp.status_code == 200, f"GET config failed: {resp.status_code}"
    cfg = resp.json()
    assert cfg["loan_days"] == 7, f"Expected loan_days=7, got {cfg['loan_days']}"
    assert cfg["max_books"] == 3, f"Expected max_books=3, got {cfg['max_books']}"
    assert cfg["fine_per_day"] == 500, f"Expected fine_per_day=500, got {cfg['fine_per_day']}"
    print(f"✅ 2.2: GET /api/library/config returns loan_days={cfg['loan_days']}, max_books={cfg['max_books']}, fine_per_day={cfg['fine_per_day']}")

def test_scenario_3_admin_crud():
    """Scenario 3: Admin CRUD operations (POST/PATCH/DELETE books) + permission checks"""
    global test_book_id
    print("\n=== SCENARIO 3: Admin CRUD operations ===")
    
    # 3.1: As admin_perpus: POST /api/books (create test book)
    new_book = {
        "title": "QA Test Book",
        "author": "QA Tester",
        "category": "Test",
        "publisher": "QA Publisher",
        "year": 2025,
        "total_copies": 3,
        "location": "Rak QA-1",
        "description": "Test book for QA automation"
    }
    resp = requests.post(f"{BASE_URL}/books", json=new_book, headers=headers(admin_token))
    assert resp.status_code == 200, f"POST /books failed: {resp.status_code} {resp.text}"
    book = resp.json()
    assert "id" in book, "Created book should have id"
    test_book_id = book["id"]
    assert book["title"] == new_book["title"], "Title mismatch"
    assert book["total_copies"] == 3, "total_copies should be 3"
    assert book["available_copies"] == 3, "available_copies should be 3"
    created_test_data.append(("book", test_book_id))
    print(f"✅ 3.1: POST /api/books created book id={test_book_id}")
    
    # 3.2: PATCH /api/books/{id} - change total_copies (verify available_copies adjusts by delta)
    # Change total_copies from 3 to 5 (delta +2)
    resp = requests.patch(f"{BASE_URL}/books/{test_book_id}", 
                         json={"total_copies": 5}, 
                         headers=headers(admin_token))
    assert resp.status_code == 200, f"PATCH /books failed: {resp.status_code} {resp.text}"
    updated = resp.json()
    assert updated["total_copies"] == 5, f"Expected total_copies=5, got {updated['total_copies']}"
    assert updated["available_copies"] == 5, f"Expected available_copies=5 (3+2), got {updated['available_copies']}"
    print(f"✅ 3.2: PATCH /api/books/{test_book_id} updated total_copies to 5, available_copies adjusted to 5")
    
    # 3.3: As siswa: POST /api/books -> expect 403
    resp = requests.post(f"{BASE_URL}/books", json=new_book, headers=headers(siswa_token))
    assert resp.status_code == 403, f"Siswa POST /books should return 403, got {resp.status_code}"
    print(f"✅ 3.3: Siswa POST /api/books correctly returns 403 (forbidden)")
    
    # 3.4: As siswa: PATCH /api/library/config -> 403
    resp = requests.patch(f"{BASE_URL}/library/config", 
                         json={"max_books": 5}, 
                         headers=headers(siswa_token))
    assert resp.status_code == 403, f"Siswa PATCH /library/config should return 403, got {resp.status_code}"
    print(f"✅ 3.4: Siswa PATCH /api/library/config correctly returns 403 (forbidden)")
    
    # 3.5: As admin_perpus: PATCH /api/library/config -> 200
    resp = requests.patch(f"{BASE_URL}/library/config", 
                         json={"max_books": 3}, 
                         headers=headers(admin_token))
    assert resp.status_code == 200, f"Admin PATCH /library/config failed: {resp.status_code}"
    cfg = resp.json()
    assert cfg["max_books"] == 3, "max_books should be 3"
    print(f"✅ 3.5: Admin PATCH /api/library/config returns 200")

def test_scenario_4_borrow_flow():
    """Scenario 4: Borrow flow - first borrow, duplicate prevention, max_books limit"""
    global test_loan_id
    print("\n=== SCENARIO 4: Borrow flow ===")
    
    # 4.1: First borrow succeeds and available_copies decrements
    resp = requests.post(f"{BASE_URL}/loans", 
                        json={"book_id": test_book_id}, 
                        headers=headers(siswa_token))
    assert resp.status_code == 200, f"POST /loans failed: {resp.status_code} {resp.text}"
    loan = resp.json()
    assert "id" in loan, "Loan should have id"
    test_loan_id = loan["id"]
    assert loan["book_id"] == test_book_id, "book_id mismatch"
    assert loan["status"] == "dipinjam", "Status should be 'dipinjam'"
    created_test_data.append(("loan", test_loan_id))
    print(f"✅ 4.1: POST /api/loans created loan id={test_loan_id}")
    
    # Verify available_copies decremented
    resp = requests.get(f"{BASE_URL}/books/{test_book_id}", headers=headers(siswa_token))
    assert resp.status_code == 200, f"GET /books/{test_book_id} failed"
    book = resp.json()
    assert book["available_copies"] == 4, f"Expected available_copies=4 (5-1), got {book['available_copies']}"
    print(f"✅ 4.1b: Book available_copies decremented to {book['available_copies']}")
    
    # 4.2: Borrowing SAME title again while active -> 400
    resp = requests.post(f"{BASE_URL}/loans", 
                        json={"book_id": test_book_id}, 
                        headers=headers(siswa_token))
    assert resp.status_code == 400, f"Duplicate borrow should return 400, got {resp.status_code}"
    assert "masih meminjam judul yang sama" in resp.text.lower(), "Error message should mention duplicate"
    print(f"✅ 4.2: Duplicate borrow correctly returns 400 (already borrowing same title)")
    
    # 4.3: Borrow until 3 active loans, 4th distinct book -> 400 (max_books=3)
    # Get 2 more distinct books from seeded books
    resp = requests.get(f"{BASE_URL}/books", headers=headers(siswa_token))
    books = resp.json()
    other_books = [b for b in books if b["id"] != test_book_id and b["available_copies"] > 0][:3]
    assert len(other_books) >= 3, "Need at least 3 other available books for testing"
    
    # Borrow 2nd book
    resp = requests.post(f"{BASE_URL}/loans", 
                        json={"book_id": other_books[0]["id"]}, 
                        headers=headers(siswa_token))
    assert resp.status_code == 200, f"2nd borrow failed: {resp.status_code}"
    loan2 = resp.json()
    created_test_data.append(("loan", loan2["id"]))
    print(f"✅ 4.3a: 2nd borrow succeeded (loan id={loan2['id']})")
    
    # Borrow 3rd book
    resp = requests.post(f"{BASE_URL}/loans", 
                        json={"book_id": other_books[1]["id"]}, 
                        headers=headers(siswa_token))
    assert resp.status_code == 200, f"3rd borrow failed: {resp.status_code}"
    loan3 = resp.json()
    created_test_data.append(("loan", loan3["id"]))
    print(f"✅ 4.3b: 3rd borrow succeeded (loan id={loan3['id']})")
    
    # Try 4th book -> should fail (max_books=3)
    resp = requests.post(f"{BASE_URL}/loans", 
                        json={"book_id": other_books[2]["id"]}, 
                        headers=headers(siswa_token))
    assert resp.status_code == 400, f"4th borrow should return 400, got {resp.status_code}"
    assert "batas maksimal" in resp.text.lower() or "max" in resp.text.lower(), "Error should mention max limit"
    print(f"✅ 4.3c: 4th borrow correctly returns 400 (max_books=3 limit reached)")

def test_scenario_5_return_flow():
    """Scenario 5: Return flow - available_copies increments, fine calculation"""
    print("\n=== SCENARIO 5: Return flow ===")
    
    # 5.1: POST /api/loans/{loan_id}/return -> 200
    resp = requests.post(f"{BASE_URL}/loans/{test_loan_id}/return", headers=headers(siswa_token))
    assert resp.status_code == 200, f"POST /loans/{test_loan_id}/return failed: {resp.status_code} {resp.text}"
    result = resp.json()
    assert "fine" in result, "Return response should have 'fine'"
    assert "days_late" in result, "Return response should have 'days_late'"
    assert result["fine"] == 0, f"Expected fine=0 (returned on time), got {result['fine']}"
    assert result["days_late"] == 0, f"Expected days_late=0, got {result['days_late']}"
    print(f"✅ 5.1: POST /api/loans/{test_loan_id}/return returns 200, fine={result['fine']}, days_late={result['days_late']}")
    
    # 5.2: Verify available_copies incremented back
    resp = requests.get(f"{BASE_URL}/books/{test_book_id}", headers=headers(siswa_token))
    assert resp.status_code == 200, f"GET /books/{test_book_id} failed"
    book = resp.json()
    assert book["available_copies"] == 5, f"Expected available_copies=5 (4+1), got {book['available_copies']}"
    print(f"✅ 5.2: Book available_copies incremented back to {book['available_copies']}")

def test_scenario_6_loan_visibility():
    """Scenario 6: GET /api/loans/my (siswa sees own) and GET /api/loans (admin sees all, siswa sees only own)"""
    print("\n=== SCENARIO 6: Loan visibility ===")
    
    # 6.1: GET /api/loans/my as siswa
    resp = requests.get(f"{BASE_URL}/loans/my", headers=headers(siswa_token))
    assert resp.status_code == 200, f"GET /loans/my failed: {resp.status_code}"
    my_loans = resp.json()
    assert isinstance(my_loans, list), "my_loans should be a list"
    assert len(my_loans) >= 2, f"Siswa should see at least 2 loans (created in test), got {len(my_loans)}"
    print(f"✅ 6.1: GET /api/loans/my returns {len(my_loans)} loan(s) for siswa")
    
    # 6.2: GET /api/loans as siswa (should see only own)
    resp = requests.get(f"{BASE_URL}/loans", headers=headers(siswa_token))
    assert resp.status_code == 200, f"GET /loans failed: {resp.status_code}"
    siswa_loans = resp.json()
    assert len(siswa_loans) == len(my_loans), "Siswa GET /loans should return same as /loans/my"
    print(f"✅ 6.2: GET /api/loans as siswa returns {len(siswa_loans)} loan(s) (only own)")
    
    # 6.3: GET /api/loans as admin_perpus (should see all)
    resp = requests.get(f"{BASE_URL}/loans", headers=headers(admin_token))
    assert resp.status_code == 200, f"GET /loans as admin failed: {resp.status_code}"
    all_loans = resp.json()
    assert len(all_loans) >= len(siswa_loans), f"Admin should see at least as many loans as siswa, got {len(all_loans)}"
    print(f"✅ 6.3: GET /api/loans as admin_perpus returns {len(all_loans)} loan(s) (all loans)")

def test_scenario_7_reservation():
    """Scenario 7: Reservation flow - reserve when available_copies=0, cannot reserve when available>0"""
    global test_reservation_id
    print("\n=== SCENARIO 7: Reservation flow ===")
    
    # 7.1: Make a book unavailable (borrow all copies or PATCH total_copies to low number then borrow)
    # Let's use the test book and reduce total_copies to 1, then borrow it
    resp = requests.patch(f"{BASE_URL}/books/{test_book_id}", 
                         json={"total_copies": 1}, 
                         headers=headers(admin_token))
    assert resp.status_code == 200, f"PATCH /books failed: {resp.status_code}"
    book = resp.json()
    print(f"✅ 7.1a: Reduced test book total_copies to 1, available_copies={book['available_copies']}")
    
    # Borrow it to make available_copies=0
    resp = requests.post(f"{BASE_URL}/loans", 
                        json={"book_id": test_book_id}, 
                        headers=headers(siswa_token))
    assert resp.status_code == 200, f"Borrow failed: {resp.status_code} {resp.text}"
    loan = resp.json()
    created_test_data.append(("loan", loan["id"]))
    print(f"✅ 7.1b: Borrowed test book, loan id={loan['id']}")
    
    # Verify available_copies=0
    resp = requests.get(f"{BASE_URL}/books/{test_book_id}", headers=headers(siswa_token))
    book = resp.json()
    assert book["available_copies"] == 0, f"Expected available_copies=0, got {book['available_copies']}"
    print(f"✅ 7.1c: Book now has available_copies=0")
    
    # 7.2: Try to reserve when available>0 -> should fail (but we just made it 0, so skip this)
    # Instead, let's test reserving when available=0 first, then test the error case
    
    # 7.3: Reserve when available_copies=0 -> 200
    # Need to use a different siswa account or logout/login as different user
    # For simplicity, let's use admin_perpus to reserve (admin can also reserve)
    resp = requests.post(f"{BASE_URL}/books/{test_book_id}/reserve", headers=headers(admin_token))
    assert resp.status_code == 200, f"POST /books/{test_book_id}/reserve failed: {resp.status_code} {resp.text}"
    reservation = resp.json()
    assert "id" in reservation, "Reservation should have id"
    test_reservation_id = reservation["id"]
    assert reservation["book_id"] == test_book_id, "book_id mismatch"
    assert reservation["status"] == "menunggu", "Status should be 'menunggu'"
    created_test_data.append(("reservation", test_reservation_id))
    print(f"✅ 7.3: POST /api/books/{test_book_id}/reserve created reservation id={test_reservation_id}")
    
    # 7.4: GET /api/reservations
    resp = requests.get(f"{BASE_URL}/reservations", headers=headers(admin_token))
    assert resp.status_code == 200, f"GET /reservations failed: {resp.status_code}"
    reservations = resp.json()
    assert isinstance(reservations, list), "Reservations should be a list"
    assert any(r["id"] == test_reservation_id for r in reservations), "Created reservation should be in list"
    print(f"✅ 7.4: GET /api/reservations returns {len(reservations)} reservation(s)")
    
    # 7.5: DELETE /api/reservations/{id}
    resp = requests.delete(f"{BASE_URL}/reservations/{test_reservation_id}", headers=headers(admin_token))
    assert resp.status_code == 200, f"DELETE /reservations/{test_reservation_id} failed: {resp.status_code}"
    print(f"✅ 7.5: DELETE /api/reservations/{test_reservation_id} returns 200")
    
    # 7.6: Test reserve when available>0 -> 400
    # Return the loan to make book available again
    resp = requests.post(f"{BASE_URL}/loans/{loan['id']}/return", headers=headers(siswa_token))
    assert resp.status_code == 200, f"Return failed: {resp.status_code}"
    print(f"✅ 7.6a: Returned loan to make book available")
    
    # Now try to reserve -> should fail
    resp = requests.post(f"{BASE_URL}/books/{test_book_id}/reserve", headers=headers(admin_token))
    assert resp.status_code == 400, f"Reserve when available>0 should return 400, got {resp.status_code}"
    assert "tersedia" in resp.text.lower() or "available" in resp.text.lower(), "Error should mention book is available"
    print(f"✅ 7.6b: Reserve when available>0 correctly returns 400")

def test_scenario_8_review():
    """Scenario 8: Review flow - rating validation, reflected in GET /api/books/{id}"""
    print("\n=== SCENARIO 8: Review flow ===")
    
    # 8.1: POST /api/books/{id}/review with rating 1-5 -> 200
    resp = requests.post(f"{BASE_URL}/books/{test_book_id}/review", 
                        json={"rating": 5, "text": "Buku bagus sekali!"}, 
                        headers=headers(siswa_token))
    assert resp.status_code == 200, f"POST /books/{test_book_id}/review failed: {resp.status_code} {resp.text}"
    review = resp.json()
    assert review["rating"] == 5, "Rating should be 5"
    print(f"✅ 8.1: POST /api/books/{test_book_id}/review with rating=5 returns 200")
    
    # 8.2: POST with rating 6 -> 400
    resp = requests.post(f"{BASE_URL}/books/{test_book_id}/review", 
                        json={"rating": 6, "text": "Invalid rating"}, 
                        headers=headers(siswa_token))
    assert resp.status_code == 400, f"Review with rating=6 should return 400, got {resp.status_code}"
    assert "1-5" in resp.text or "rating" in resp.text.lower(), "Error should mention rating range"
    print(f"✅ 8.2: POST /api/books/{test_book_id}/review with rating=6 correctly returns 400")
    
    # 8.3: GET /api/books/{id} shows rating_avg and rating_count
    resp = requests.get(f"{BASE_URL}/books/{test_book_id}", headers=headers(siswa_token))
    assert resp.status_code == 200, f"GET /books/{test_book_id} failed: {resp.status_code}"
    book = resp.json()
    assert "rating_avg" in book, "Book should have rating_avg"
    assert "rating_count" in book, "Book should have rating_count"
    assert book["rating_count"] >= 1, f"Expected rating_count >= 1, got {book['rating_count']}"
    assert book["rating_avg"] > 0, f"Expected rating_avg > 0, got {book['rating_avg']}"
    print(f"✅ 8.3: GET /api/books/{test_book_id} shows rating_avg={book['rating_avg']}, rating_count={book['rating_count']}")

def test_scenario_9_admin_stats():
    """Scenario 9: Admin stats - GET /api/library/stats and /api/library/popular"""
    print("\n=== SCENARIO 9: Admin stats ===")
    
    # 9.1: GET /api/library/stats (admin only)
    resp = requests.get(f"{BASE_URL}/library/stats", headers=headers(admin_token))
    assert resp.status_code == 200, f"GET /library/stats failed: {resp.status_code} {resp.text}"
    stats = resp.json()
    required_fields = ["total_titles", "total_copies", "available", "borrowed", "overdue", 
                      "reservations", "popular", "by_category"]
    for field in required_fields:
        assert field in stats, f"Stats should have '{field}' field"
    assert stats["total_titles"] >= 8, f"Expected total_titles >= 8, got {stats['total_titles']}"
    assert isinstance(stats["popular"], list), "popular should be a list"
    assert isinstance(stats["by_category"], list), "by_category should be a list"
    print(f"✅ 9.1: GET /api/library/stats returns all required fields: total_titles={stats['total_titles']}, "
          f"total_copies={stats['total_copies']}, available={stats['available']}, borrowed={stats['borrowed']}")
    
    # 9.2: GET /api/library/popular
    resp = requests.get(f"{BASE_URL}/library/popular", headers=headers(siswa_token))
    assert resp.status_code == 200, f"GET /library/popular failed: {resp.status_code}"
    popular = resp.json()
    assert isinstance(popular, list), "Popular should be a list"
    assert len(popular) >= 1, "Should have at least 1 popular book"
    print(f"✅ 9.2: GET /api/library/popular returns {len(popular)} book(s)")

def test_scenario_10_ai_features():
    """Scenario 10: AI features - POST /api/books/{id}/ai-summary and GET /api/library/ai-recommendations"""
    print("\n=== SCENARIO 10: AI features (OpenAI gpt-5.4) ===")
    
    # 10.1: POST /api/books/{id}/ai-summary
    print(f"⏳ 10.1: Calling POST /api/books/{test_book_id}/ai-summary (may take a few seconds)...")
    resp = requests.post(f"{BASE_URL}/books/{test_book_id}/ai-summary", headers=headers(siswa_token), timeout=30)
    assert resp.status_code == 200, f"POST /books/{test_book_id}/ai-summary failed: {resp.status_code} {resp.text}"
    result = resp.json()
    assert "summary" in result, "AI summary response should have 'summary' field"
    assert len(result["summary"]) > 10, f"Summary should be non-empty, got: {result['summary']}"
    print(f"✅ 10.1: POST /api/books/{test_book_id}/ai-summary returns summary (length={len(result['summary'])} chars)")
    
    # 10.2: GET /api/library/ai-recommendations
    print("⏳ 10.2: Calling GET /api/library/ai-recommendations (may take a few seconds)...")
    resp = requests.get(f"{BASE_URL}/library/ai-recommendations", headers=headers(siswa_token), timeout=30)
    assert resp.status_code == 200, f"GET /library/ai-recommendations failed: {resp.status_code} {resp.text}"
    result = resp.json()
    assert "recommendations" in result, "AI recommendations response should have 'recommendations' field"
    assert len(result["recommendations"]) > 10, f"Recommendations should be non-empty, got: {result['recommendations']}"
    print(f"✅ 10.2: GET /api/library/ai-recommendations returns recommendations (length={len(result['recommendations'])} chars)")

def test_scenario_11_excel_export():
    """Scenario 11: Excel export - GET /api/library/loans/export returns xlsx file"""
    print("\n=== SCENARIO 11: Excel export ===")
    
    resp = requests.get(f"{BASE_URL}/library/loans/export", headers=headers(admin_token))
    assert resp.status_code == 200, f"GET /library/loans/export failed: {resp.status_code} {resp.text}"
    assert "spreadsheet" in resp.headers.get("Content-Type", "").lower() or \
           "excel" in resp.headers.get("Content-Type", "").lower(), \
           f"Content-Type should be spreadsheet/excel, got: {resp.headers.get('Content-Type')}"
    assert len(resp.content) > 100, f"Excel file should be non-empty, got {len(resp.content)} bytes"
    print(f"✅ 11: GET /api/library/loans/export returns xlsx file ({len(resp.content)} bytes, "
          f"Content-Type: {resp.headers.get('Content-Type')})")

def cleanup():
    """Clean up test data"""
    print("\n=== CLEANUP: Removing test data ===")
    
    # Delete in reverse order (loans, reservations, then book)
    for data_type, data_id in reversed(created_test_data):
        try:
            if data_type == "loan":
                # Return loan first if not already returned
                resp = requests.post(f"{BASE_URL}/loans/{data_id}/return", headers=headers(siswa_token))
                if resp.status_code == 200:
                    print(f"✅ Returned loan {data_id}")
            elif data_type == "reservation":
                resp = requests.delete(f"{BASE_URL}/reservations/{data_id}", headers=headers(admin_token))
                if resp.status_code == 200:
                    print(f"✅ Deleted reservation {data_id}")
        except Exception as e:
            print(f"⚠️  Cleanup warning for {data_type} {data_id}: {e}")
    
    # Delete test book
    if test_book_id:
        try:
            resp = requests.delete(f"{BASE_URL}/books/{test_book_id}", headers=headers(admin_token))
            if resp.status_code == 200:
                print(f"✅ Deleted test book {test_book_id}")
            else:
                print(f"⚠️  Could not delete test book {test_book_id}: {resp.status_code} {resp.text}")
        except Exception as e:
            print(f"⚠️  Cleanup error for test book: {e}")

def main():
    global admin_token, siswa_token
    
    print("=" * 80)
    print("SMART LIBRARY (PERPUSTAKAAN PINTAR) BACKEND TEST SUITE")
    print("=" * 80)
    print(f"Base URL: {BASE_URL}")
    print(f"Demo Admin Perpus: {ADMIN_PERPUS['email']}")
    print(f"Demo Siswa: {SISWA['email']}")
    print("=" * 80)
    
    try:
        # Login
        print("\n=== LOGIN ===")
        admin_token = login(ADMIN_PERPUS)
        print(f"✅ Logged in as admin_perpus: {ADMIN_PERPUS['email']}")
        siswa_token = login(SISWA)
        print(f"✅ Logged in as siswa: {SISWA['email']}")
        
        # Run all scenarios
        test_scenario_1_get_books()
        test_scenario_2_get_categories_and_config()
        test_scenario_3_admin_crud()
        test_scenario_4_borrow_flow()
        test_scenario_5_return_flow()
        test_scenario_6_loan_visibility()
        test_scenario_7_reservation()
        test_scenario_8_review()
        test_scenario_9_admin_stats()
        test_scenario_10_ai_features()
        test_scenario_11_excel_export()
        
        # Cleanup
        cleanup()
        
        print("\n" + "=" * 80)
        print("✅ ALL TESTS PASSED - Smart Library backend is fully functional!")
        print("=" * 80)
        return 0
        
    except AssertionError as e:
        print(f"\n❌ TEST FAILED: {e}")
        print("\nAttempting cleanup...")
        cleanup()
        return 1
    except Exception as e:
        print(f"\n❌ UNEXPECTED ERROR: {e}")
        import traceback
        traceback.print_exc()
        print("\nAttempting cleanup...")
        cleanup()
        return 1

if __name__ == "__main__":
    exit(main())
