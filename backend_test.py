#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class NotificationAPITester:
    def __init__(self, base_url="https://dev-onboarding-path.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.session = requests.Session()

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {method} {url}")
        
        try:
            if method == 'GET':
                response = self.session.get(url, headers=test_headers)
            elif method == 'POST':
                response = self.session.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = self.session.put(url, json=data, headers=test_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_login(self, email, password):
        """Test login and get token"""
        success, response = self.run_test(
            "Login",
            "POST",
            "api/auth/login",
            200,
            data={"email": email, "password": password}
        )
        if success and 'token' in response:
            self.token = response['token']
            print(f"   Token obtained: {self.token[:20]}...")
            return True
        return False

    def test_vapid_key(self):
        """Test GET /api/notifications/vapid-key"""
        success, response = self.run_test(
            "Get VAPID Key",
            "GET",
            "api/notifications/vapid-key",
            200
        )
        if success and 'public_key' in response:
            print(f"   VAPID Key: {response['public_key'][:20]}...")
            return True
        return False

    def test_get_notifications(self):
        """Test GET /api/notifications"""
        success, response = self.run_test(
            "Get Notifications",
            "GET",
            "api/notifications",
            200
        )
        if success:
            notifications = response.get('notifications', [])
            unread_count = response.get('unread_count', 0)
            print(f"   Found {len(notifications)} notifications, {unread_count} unread")
            return True, notifications, unread_count
        return False, [], 0

    def test_check_alerts(self):
        """Test POST /api/notifications/check"""
        success, response = self.run_test(
            "Check Alerts",
            "POST",
            "api/notifications/check",
            200
        )
        if success:
            new_notifications = response.get('new_notifications', 0)
            total_alerts = response.get('total_alerts', 0)
            print(f"   Generated {new_notifications} new notifications from {total_alerts} alerts")
            return True
        return False

    def test_mark_notification_read(self, notification_id):
        """Test PUT /api/notifications/{id}/read"""
        success, response = self.run_test(
            f"Mark Notification {notification_id} as Read",
            "PUT",
            f"api/notifications/{notification_id}/read",
            200
        )
        return success

    def test_mark_all_read(self):
        """Test PUT /api/notifications/read-all"""
        success, response = self.run_test(
            "Mark All Notifications as Read",
            "PUT",
            "api/notifications/read-all",
            200
        )
        return success

    def test_push_subscription(self):
        """Test POST /api/notifications/subscribe"""
        # Mock push subscription data
        mock_subscription = {
            "endpoint": "https://fcm.googleapis.com/fcm/send/test-endpoint",
            "keys": {
                "p256dh": "test-p256dh-key",
                "auth": "test-auth-key"
            }
        }
        
        success, response = self.run_test(
            "Subscribe to Push Notifications",
            "POST",
            "api/notifications/subscribe",
            200,
            data=mock_subscription
        )
        return success

def main():
    print("🚀 Starting Notification System API Tests")
    print("=" * 50)
    
    # Setup
    tester = NotificationAPITester()
    
    # Test login first
    print("\n📋 AUTHENTICATION TESTS")
    if not tester.test_login("admin@fazenda.com", "admin123"):
        print("❌ Login failed, stopping tests")
        return 1

    # Test VAPID key endpoint
    print("\n📋 VAPID KEY TESTS")
    if not tester.test_vapid_key():
        print("❌ VAPID key test failed")

    # Test notifications endpoints
    print("\n📋 NOTIFICATION TESTS")
    
    # Get initial notifications
    success, notifications, unread_count = tester.test_get_notifications()
    if not success:
        print("❌ Get notifications failed")
        return 1

    # Check for new alerts
    if not tester.test_check_alerts():
        print("❌ Check alerts failed")

    # Get notifications again to see if new ones were created
    success, new_notifications, new_unread_count = tester.test_get_notifications()
    if success:
        print(f"   Notifications before check: {len(notifications)}, after: {len(new_notifications)}")
        print(f"   Unread before: {unread_count}, after: {new_unread_count}")

    # Test marking notifications as read if we have any
    if new_notifications:
        # Test marking individual notification as read
        first_unread = next((n for n in new_notifications if not n.get('read', False)), None)
        if first_unread:
            if not tester.test_mark_notification_read(first_unread['id']):
                print("❌ Mark individual notification as read failed")

        # Test marking all as read
        if not tester.test_mark_all_read():
            print("❌ Mark all notifications as read failed")

    # Test push subscription
    print("\n📋 PUSH NOTIFICATION TESTS")
    if not tester.test_push_subscription():
        print("❌ Push subscription test failed")

    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 Tests completed: {tester.tests_passed}/{tester.tests_run} passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print(f"⚠️  {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())