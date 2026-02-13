import requests
import sys
from datetime import datetime, timezone

class SupplyChainAPITester:
    def __init__(self, base_url="https://supply-nexus-18.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_items = []  # Track created items for cleanup

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        request_headers = {'Content-Type': 'application/json'}
        if self.token:
            request_headers['Authorization'] = f'Bearer {self.token}'
        if headers:
            request_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=request_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=request_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=request_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=request_headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json() if response.content else {}
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data.get('detail', 'Unknown error')}")
                except:
                    print(f"   Response: {response.text[:200]}")
                return False, {}

        except requests.exceptions.RequestException as e:
            print(f"❌ Failed - Network Error: {str(e)}")
            return False, {}
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_signup(self, email, password, name):
        """Test user signup"""
        success, response = self.run_test(
            "User Signup",
            "POST",
            "auth/signup",
            200,
            data={"email": email, "password": password, "name": name}
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            print(f"   User created: {response.get('user', {}).get('name', 'Unknown')}")
            return True
        return False

    def test_login(self, email, password):
        """Test user login"""
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data={"email": email, "password": password}
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            print(f"   Logged in as: {response.get('user', {}).get('name', 'Unknown')}")
            return True
        return False

    def test_get_me(self):
        """Test get current user"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        if success:
            print(f"   Current user: {response.get('name', 'Unknown')}")
        return success

    def test_seed_data(self):
        """Test seeding sample data"""
        success, response = self.run_test(
            "Seed Sample Data",
            "POST",
            "seed",
            200
        )
        if success:
            print(f"   Message: {response.get('message', 'Data seeded')}")
        return success

    def test_inventory_crud(self):
        """Test inventory CRUD operations"""
        print("\n📦 Testing Inventory CRUD...")
        
        # Get all inventory
        success, inventory = self.run_test(
            "Get All Inventory",
            "GET",
            "inventory",
            200
        )
        if not success:
            return False
        
        print(f"   Found {len(inventory)} inventory items")
        
        # Create new inventory item
        new_item = {
            "sku": f"TEST-{datetime.now().strftime('%H%M%S')}",
            "name": "Test Product",
            "category": "Testing",
            "quantity": 100,
            "min_stock": 10,
            "max_stock": 500,
            "unit_price": 25.99,
            "warehouse": "Test Warehouse",
            "location": "T-01-1"
        }
        
        success, created = self.run_test(
            "Create Inventory Item",
            "POST",
            "inventory",
            200,
            data=new_item
        )
        if not success:
            return False
        
        item_id = created.get('id')
        if item_id:
            self.created_items.append(('inventory', item_id))
            print(f"   Created item: {created.get('name')} (ID: {item_id})")
        
        # Update inventory item
        update_data = {**new_item, "quantity": 150}
        success, updated = self.run_test(
            "Update Inventory Item",
            "PUT",
            f"inventory/{item_id}",
            200,
            data=update_data
        )
        if success:
            print(f"   Updated quantity to: {updated.get('quantity')}")
        
        return success

    def test_supplier_crud(self):
        """Test supplier CRUD operations"""
        print("\n🏢 Testing Supplier CRUD...")
        
        # Get all suppliers
        success, suppliers = self.run_test(
            "Get All Suppliers",
            "GET",
            "suppliers",
            200
        )
        if not success:
            return False
        
        print(f"   Found {len(suppliers)} suppliers")
        
        # Create new supplier
        new_supplier = {
            "name": f"Test Supplier {datetime.now().strftime('%H%M%S')}",
            "contact_email": f"test{datetime.now().strftime('%H%M%S')}@example.com",
            "contact_phone": "+1-555-TEST",
            "address": "123 Test Street",
            "country": "USA",
            "risk_score": 15.0,
            "sla_compliance": 95.0,
            "on_time_delivery": 92.0,
            "quality_rating": 4.5
        }
        
        success, created = self.run_test(
            "Create Supplier",
            "POST",
            "suppliers",
            200,
            data=new_supplier
        )
        if not success:
            return False
        
        supplier_id = created.get('id')
        if supplier_id:
            self.created_items.append(('supplier', supplier_id))
            print(f"   Created supplier: {created.get('name')} (ID: {supplier_id})")
        
        return success

    def test_order_crud(self):
        """Test order CRUD operations"""
        print("\n📋 Testing Order CRUD...")
        
        # Get all orders
        success, orders = self.run_test(
            "Get All Orders",
            "GET",
            "orders",
            200
        )
        if not success:
            return False
        
        print(f"   Found {len(orders)} orders")
        
        # Get suppliers for order creation
        success, suppliers = self.run_test(
            "Get Suppliers for Order",
            "GET",
            "suppliers",
            200
        )
        if not success or not suppliers:
            print("   ⚠️ No suppliers found, skipping order creation")
            return True
        
        # Create new order
        supplier = suppliers[0]
        new_order = {
            "order_number": f"TEST-{datetime.now().strftime('%Y%m%d-%H%M%S')}",
            "supplier_id": supplier['id'],
            "supplier_name": supplier['name'],
            "items": [
                {
                    "sku": "TEST-001",
                    "name": "Test Item",
                    "quantity": 10,
                    "unit_price": 50.0
                }
            ],
            "total_amount": 500.0,
            "status": "pending",
            "notes": "Test order creation"
        }
        
        success, created = self.run_test(
            "Create Order",
            "POST",
            "orders",
            200,
            data=new_order
        )
        if not success:
            return False
        
        order_id = created.get('id')
        if order_id:
            self.created_items.append(('order', order_id))
            print(f"   Created order: {created.get('order_number')} (ID: {order_id})")
        
        # Update order status
        update_data = {"status": "confirmed"}
        success, updated = self.run_test(
            "Update Order Status",
            "PUT",
            f"orders/{order_id}",
            200,
            data=update_data
        )
        if success:
            print(f"   Updated status to: {updated.get('status')}")
        
        return success

    def test_forecast_crud(self):
        """Test forecast CRUD operations"""
        print("\n📊 Testing Forecast CRUD...")
        
        # Get all forecasts
        success, forecasts = self.run_test(
            "Get All Forecasts",
            "GET",
            "forecasts",
            200
        )
        if not success:
            return False
        
        print(f"   Found {len(forecasts)} forecasts")
        
        # Create new forecast
        new_forecast = {
            "sku": f"TEST-{datetime.now().strftime('%H%M%S')}",
            "product_name": "Test Product Forecast",
            "warehouse": "Test Warehouse",
            "period": "2024-12",
            "predicted_demand": 250,
            "actual_demand": 240,
            "confidence": 0.88
        }
        
        success, created = self.run_test(
            "Create Forecast",
            "POST",
            "forecasts",
            200,
            data=new_forecast
        )
        if not success:
            return False
        
        forecast_id = created.get('id')
        if forecast_id:
            self.created_items.append(('forecast', forecast_id))
            print(f"   Created forecast: {created.get('product_name')} (ID: {forecast_id})")
        
        return success

    def test_dashboard_endpoints(self):
        """Test dashboard API endpoints"""
        print("\n📈 Testing Dashboard APIs...")
        
        endpoints = [
            ("Dashboard Stats", "dashboard/stats"),
            ("Stock Levels", "dashboard/stock-levels"),
            ("Warehouse Stats", "dashboard/warehouse-stats"),
            ("Alerts", "dashboard/alerts")
        ]
        
        all_success = True
        for name, endpoint in endpoints:
            success, data = self.run_test(
                name,
                "GET",
                endpoint,
                200
            )
            if success:
                if isinstance(data, dict):
                    print(f"   Data keys: {list(data.keys())}")
                elif isinstance(data, list):
                    print(f"   Returned {len(data)} items")
            all_success = all_success and success
        
        return all_success

    def cleanup_created_items(self):
        """Clean up test data"""
        print("\n🧹 Cleaning up test data...")
        cleanup_count = 0
        
        for item_type, item_id in self.created_items:
            try:
                endpoint_map = {
                    'inventory': 'inventory',
                    'supplier': 'suppliers',
                    'order': 'orders',
                    'forecast': 'forecasts'
                }
                endpoint = endpoint_map.get(item_type)
                if endpoint:
                    success, _ = self.run_test(
                        f"Cleanup {item_type}",
                        "DELETE",
                        f"{endpoint}/{item_id}",
                        200
                    )
                    if success:
                        cleanup_count += 1
            except:
                pass
        
        print(f"   Cleaned up {cleanup_count}/{len(self.created_items)} test items")

def main():
    # Setup
    tester = SupplyChainAPITester("https://supply-nexus-18.preview.emergentagent.com")
    test_timestamp = datetime.now().strftime('%H%M%S')
    test_email = f"testuser{test_timestamp}@example.com"
    test_password = "TestPass123!"
    test_name = f"Test User {test_timestamp}"

    try:
        print("🚀 Starting Supply Chain API Testing...")
        print(f"Base URL: {tester.base_url}")
        
        # Test authentication flow
        print("\n=== Authentication Tests ===")
        if not tester.test_signup(test_email, test_password, test_name):
            print("❌ Signup failed, stopping tests")
            return 1
        
        if not tester.test_get_me():
            print("❌ Get current user failed")
        
        # Test data seeding
        print("\n=== Data Seeding Tests ===")
        if not tester.test_seed_data():
            print("⚠️ Seed data failed, continuing with other tests")
        
        # Test CRUD operations
        print("\n=== CRUD Operations Tests ===")
        crud_results = [
            tester.test_inventory_crud(),
            tester.test_supplier_crud(),
            tester.test_order_crud(),
            tester.test_forecast_crud()
        ]
        
        # Test dashboard endpoints
        print("\n=== Dashboard API Tests ===")
        dashboard_result = tester.test_dashboard_endpoints()
        
        # Cleanup test data
        tester.cleanup_created_items()
        
        # Print final results
        print(f"\n📊 Final Results:")
        print(f"   Tests passed: {tester.tests_passed}/{tester.tests_run}")
        print(f"   Success rate: {(tester.tests_passed/tester.tests_run*100):.1f}%")
        
        if tester.tests_passed == tester.tests_run:
            print("🎉 All backend API tests passed!")
            return 0
        else:
            print("❌ Some backend API tests failed")
            return 1

    except Exception as e:
        print(f"💥 Test suite crashed: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())