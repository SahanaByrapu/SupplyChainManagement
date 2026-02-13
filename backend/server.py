from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
SECRET_KEY = os.environ.get('JWT_SECRET', 'nexuslogistics-secret-key-2024')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Create the main app
app = FastAPI(title="NexusLogistics API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ======================== MODELS ========================

class UserBase(BaseModel):
    email: EmailStr
    name: str

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(UserBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

class InventoryItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sku: str
    name: str
    category: str
    quantity: int
    min_stock: int = 10
    max_stock: int = 1000
    unit_price: float
    warehouse: str
    location: str = ""
    last_updated: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: str = "active"

class InventoryCreate(BaseModel):
    sku: str
    name: str
    category: str
    quantity: int
    min_stock: int = 10
    max_stock: int = 1000
    unit_price: float
    warehouse: str
    location: str = ""

class Supplier(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    contact_email: EmailStr
    contact_phone: str
    address: str
    country: str
    risk_score: float = 0.0  # 0-100
    sla_compliance: float = 100.0  # percentage
    on_time_delivery: float = 100.0  # percentage
    quality_rating: float = 5.0  # 1-5
    status: str = "active"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SupplierCreate(BaseModel):
    name: str
    contact_email: EmailStr
    contact_phone: str
    address: str
    country: str
    risk_score: float = 0.0
    sla_compliance: float = 100.0
    on_time_delivery: float = 100.0
    quality_rating: float = 5.0

class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_number: str
    supplier_id: str
    supplier_name: str
    items: List[dict]  # [{sku, name, quantity, unit_price}]
    total_amount: float
    status: str = "pending"  # pending, confirmed, shipped, delivered, cancelled, backorder
    order_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expected_delivery: Optional[datetime] = None
    actual_delivery: Optional[datetime] = None
    notes: str = ""

class OrderCreate(BaseModel):
    order_number: str
    supplier_id: str
    supplier_name: str
    items: List[dict]
    total_amount: float
    status: str = "pending"
    expected_delivery: Optional[datetime] = None
    notes: str = ""

class OrderUpdate(BaseModel):
    status: Optional[str] = None
    expected_delivery: Optional[datetime] = None
    actual_delivery: Optional[datetime] = None
    notes: Optional[str] = None

class Forecast(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sku: str
    product_name: str
    warehouse: str
    period: str  # e.g., "2024-01", "2024-Q1"
    predicted_demand: int
    actual_demand: Optional[int] = None
    confidence: float = 0.85
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ForecastCreate(BaseModel):
    sku: str
    product_name: str
    warehouse: str
    period: str
    predicted_demand: int
    actual_demand: Optional[int] = None
    confidence: float = 0.85

# ======================== AUTH HELPERS ========================

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ======================== AUTH ROUTES ========================

@api_router.post("/auth/signup", response_model=Token)
async def signup(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = User(email=user_data.email, name=user_data.name)
    user_doc = user.model_dump()
    user_doc['password'] = get_password_hash(user_data.password)
    user_doc['created_at'] = user_doc['created_at'].isoformat()
    
    await db.users.insert_one(user_doc)
    
    token = create_access_token({"sub": user.id})
    return Token(access_token=token, user={"id": user.id, "email": user.email, "name": user.name})

@api_router.post("/auth/login", response_model=Token)
async def login(login_data: UserLogin):
    user = await db.users.find_one({"email": login_data.email}, {"_id": 0})
    if not user or not verify_password(login_data.password, user['password']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_access_token({"sub": user['id']})
    return Token(access_token=token, user={"id": user['id'], "email": user['email'], "name": user['name']})

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user

# ======================== INVENTORY ROUTES ========================

@api_router.get("/inventory", response_model=List[InventoryItem])
async def get_inventory(current_user: dict = Depends(get_current_user)):
    items = await db.inventory.find({}, {"_id": 0}).to_list(1000)
    for item in items:
        if isinstance(item.get('last_updated'), str):
            item['last_updated'] = datetime.fromisoformat(item['last_updated'])
    return items

@api_router.get("/inventory/{item_id}", response_model=InventoryItem)
async def get_inventory_item(item_id: str, current_user: dict = Depends(get_current_user)):
    item = await db.inventory.find_one({"id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    if isinstance(item.get('last_updated'), str):
        item['last_updated'] = datetime.fromisoformat(item['last_updated'])
    return item

@api_router.post("/inventory", response_model=InventoryItem)
async def create_inventory_item(item_data: InventoryCreate, current_user: dict = Depends(get_current_user)):
    item = InventoryItem(**item_data.model_dump())
    doc = item.model_dump()
    doc['last_updated'] = doc['last_updated'].isoformat()
    await db.inventory.insert_one(doc)
    return item

@api_router.put("/inventory/{item_id}", response_model=InventoryItem)
async def update_inventory_item(item_id: str, item_data: InventoryCreate, current_user: dict = Depends(get_current_user)):
    existing = await db.inventory.find_one({"id": item_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Item not found")
    
    update_data = item_data.model_dump()
    update_data['last_updated'] = datetime.now(timezone.utc).isoformat()
    
    await db.inventory.update_one({"id": item_id}, {"$set": update_data})
    updated = await db.inventory.find_one({"id": item_id}, {"_id": 0})
    if isinstance(updated.get('last_updated'), str):
        updated['last_updated'] = datetime.fromisoformat(updated['last_updated'])
    return updated

@api_router.delete("/inventory/{item_id}")
async def delete_inventory_item(item_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.inventory.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Item deleted"}

# ======================== SUPPLIER ROUTES ========================

@api_router.get("/suppliers", response_model=List[Supplier])
async def get_suppliers(current_user: dict = Depends(get_current_user)):
    suppliers = await db.suppliers.find({}, {"_id": 0}).to_list(1000)
    for s in suppliers:
        if isinstance(s.get('created_at'), str):
            s['created_at'] = datetime.fromisoformat(s['created_at'])
    return suppliers

@api_router.get("/suppliers/{supplier_id}", response_model=Supplier)
async def get_supplier(supplier_id: str, current_user: dict = Depends(get_current_user)):
    supplier = await db.suppliers.find_one({"id": supplier_id}, {"_id": 0})
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    if isinstance(supplier.get('created_at'), str):
        supplier['created_at'] = datetime.fromisoformat(supplier['created_at'])
    return supplier

@api_router.post("/suppliers", response_model=Supplier)
async def create_supplier(supplier_data: SupplierCreate, current_user: dict = Depends(get_current_user)):
    supplier = Supplier(**supplier_data.model_dump())
    doc = supplier.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.suppliers.insert_one(doc)
    return supplier

@api_router.put("/suppliers/{supplier_id}", response_model=Supplier)
async def update_supplier(supplier_id: str, supplier_data: SupplierCreate, current_user: dict = Depends(get_current_user)):
    existing = await db.suppliers.find_one({"id": supplier_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    update_data = supplier_data.model_dump()
    await db.suppliers.update_one({"id": supplier_id}, {"$set": update_data})
    updated = await db.suppliers.find_one({"id": supplier_id}, {"_id": 0})
    if isinstance(updated.get('created_at'), str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    return updated

@api_router.delete("/suppliers/{supplier_id}")
async def delete_supplier(supplier_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.suppliers.delete_one({"id": supplier_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return {"message": "Supplier deleted"}

# ======================== ORDER ROUTES ========================

@api_router.get("/orders", response_model=List[Order])
async def get_orders(current_user: dict = Depends(get_current_user)):
    orders = await db.orders.find({}, {"_id": 0}).to_list(1000)
    for o in orders:
        if isinstance(o.get('order_date'), str):
            o['order_date'] = datetime.fromisoformat(o['order_date'])
        if isinstance(o.get('expected_delivery'), str):
            o['expected_delivery'] = datetime.fromisoformat(o['expected_delivery'])
        if isinstance(o.get('actual_delivery'), str):
            o['actual_delivery'] = datetime.fromisoformat(o['actual_delivery'])
    return orders

@api_router.get("/orders/{order_id}", response_model=Order)
async def get_order(order_id: str, current_user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if isinstance(order.get('order_date'), str):
        order['order_date'] = datetime.fromisoformat(order['order_date'])
    if isinstance(order.get('expected_delivery'), str):
        order['expected_delivery'] = datetime.fromisoformat(order['expected_delivery'])
    if isinstance(order.get('actual_delivery'), str):
        order['actual_delivery'] = datetime.fromisoformat(order['actual_delivery'])
    return order

@api_router.post("/orders", response_model=Order)
async def create_order(order_data: OrderCreate, current_user: dict = Depends(get_current_user)):
    order = Order(**order_data.model_dump())
    doc = order.model_dump()
    doc['order_date'] = doc['order_date'].isoformat()
    if doc.get('expected_delivery'):
        doc['expected_delivery'] = doc['expected_delivery'].isoformat()
    if doc.get('actual_delivery'):
        doc['actual_delivery'] = doc['actual_delivery'].isoformat()
    await db.orders.insert_one(doc)
    return order

@api_router.put("/orders/{order_id}", response_model=Order)
async def update_order(order_id: str, order_data: OrderUpdate, current_user: dict = Depends(get_current_user)):
    existing = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Order not found")
    
    update_data = {k: v for k, v in order_data.model_dump().items() if v is not None}
    if 'expected_delivery' in update_data and update_data['expected_delivery']:
        update_data['expected_delivery'] = update_data['expected_delivery'].isoformat()
    if 'actual_delivery' in update_data and update_data['actual_delivery']:
        update_data['actual_delivery'] = update_data['actual_delivery'].isoformat()
    
    await db.orders.update_one({"id": order_id}, {"$set": update_data})
    return await get_order(order_id, current_user)

@api_router.delete("/orders/{order_id}")
async def delete_order(order_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.orders.delete_one({"id": order_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"message": "Order deleted"}

# ======================== FORECAST ROUTES ========================

@api_router.get("/forecasts", response_model=List[Forecast])
async def get_forecasts(current_user: dict = Depends(get_current_user)):
    forecasts = await db.forecasts.find({}, {"_id": 0}).to_list(1000)
    for f in forecasts:
        if isinstance(f.get('created_at'), str):
            f['created_at'] = datetime.fromisoformat(f['created_at'])
    return forecasts

@api_router.post("/forecasts", response_model=Forecast)
async def create_forecast(forecast_data: ForecastCreate, current_user: dict = Depends(get_current_user)):
    forecast = Forecast(**forecast_data.model_dump())
    doc = forecast.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.forecasts.insert_one(doc)
    return forecast

@api_router.delete("/forecasts/{forecast_id}")
async def delete_forecast(forecast_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.forecasts.delete_one({"id": forecast_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Forecast not found")
    return {"message": "Forecast deleted"}

# ======================== DASHBOARD ROUTES ========================

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    # Inventory stats
    inventory = await db.inventory.find({}, {"_id": 0}).to_list(1000)
    total_items = len(inventory)
    total_value = sum(item['quantity'] * item['unit_price'] for item in inventory)
    low_stock_items = [item for item in inventory if item['quantity'] <= item['min_stock']]
    
    # Supplier stats
    suppliers = await db.suppliers.find({}, {"_id": 0}).to_list(1000)
    avg_sla = sum(s['sla_compliance'] for s in suppliers) / len(suppliers) if suppliers else 0
    high_risk_suppliers = [s for s in suppliers if s['risk_score'] > 50]
    
    # Order stats
    orders = await db.orders.find({}, {"_id": 0}).to_list(1000)
    pending_orders = len([o for o in orders if o['status'] == 'pending'])
    backorders = len([o for o in orders if o['status'] == 'backorder'])
    
    return {
        "inventory": {
            "total_items": total_items,
            "total_value": round(total_value, 2),
            "low_stock_count": len(low_stock_items),
            "low_stock_items": low_stock_items[:5]
        },
        "suppliers": {
            "total_suppliers": len(suppliers),
            "avg_sla_compliance": round(avg_sla, 1),
            "high_risk_count": len(high_risk_suppliers)
        },
        "orders": {
            "total_orders": len(orders),
            "pending_orders": pending_orders,
            "backorders": backorders
        }
    }

@api_router.get("/dashboard/stock-levels")
async def get_stock_levels(current_user: dict = Depends(get_current_user)):
    inventory = await db.inventory.find({}, {"_id": 0}).to_list(1000)
    # Group by category
    categories = {}
    for item in inventory:
        cat = item['category']
        if cat not in categories:
            categories[cat] = {"category": cat, "quantity": 0, "value": 0}
        categories[cat]['quantity'] += item['quantity']
        categories[cat]['value'] += item['quantity'] * item['unit_price']
    
    return list(categories.values())

@api_router.get("/dashboard/warehouse-stats")
async def get_warehouse_stats(current_user: dict = Depends(get_current_user)):
    inventory = await db.inventory.find({}, {"_id": 0}).to_list(1000)
    warehouses = {}
    for item in inventory:
        wh = item['warehouse']
        if wh not in warehouses:
            warehouses[wh] = {"warehouse": wh, "items": 0, "quantity": 0, "value": 0}
        warehouses[wh]['items'] += 1
        warehouses[wh]['quantity'] += item['quantity']
        warehouses[wh]['value'] += item['quantity'] * item['unit_price']
    
    return list(warehouses.values())

@api_router.get("/dashboard/alerts")
async def get_alerts(current_user: dict = Depends(get_current_user)):
    alerts = []
    
    # Low stock alerts
    inventory = await db.inventory.find({}, {"_id": 0}).to_list(1000)
    for item in inventory:
        if item['quantity'] <= item['min_stock']:
            alerts.append({
                "type": "low_stock",
                "severity": "critical" if item['quantity'] == 0 else "warning",
                "message": f"Low stock: {item['name']} ({item['sku']}) - {item['quantity']} units left",
                "item_id": item['id'],
                "sku": item['sku']
            })
    
    # High risk supplier alerts
    suppliers = await db.suppliers.find({}, {"_id": 0}).to_list(1000)
    for supplier in suppliers:
        if supplier['risk_score'] > 70:
            alerts.append({
                "type": "supplier_risk",
                "severity": "critical",
                "message": f"High risk supplier: {supplier['name']} - Risk Score: {supplier['risk_score']}",
                "supplier_id": supplier['id']
            })
        elif supplier['sla_compliance'] < 80:
            alerts.append({
                "type": "sla_warning",
                "severity": "warning",
                "message": f"SLA compliance below target: {supplier['name']} - {supplier['sla_compliance']}%",
                "supplier_id": supplier['id']
            })
    
    # Backorder alerts
    orders = await db.orders.find({"status": "backorder"}, {"_id": 0}).to_list(100)
    for order in orders:
        alerts.append({
            "type": "backorder",
            "severity": "warning",
            "message": f"Backorder: Order #{order['order_number']} from {order['supplier_name']}",
            "order_id": order['id']
        })
    
    return sorted(alerts, key=lambda x: 0 if x['severity'] == 'critical' else 1)

# ======================== SEED DATA ========================

@api_router.post("/seed")
async def seed_data(current_user: dict = Depends(get_current_user)):
    """Seed database with sample data"""
    
    # Clear existing data
    await db.inventory.delete_many({})
    await db.suppliers.delete_many({})
    await db.orders.delete_many({})
    await db.forecasts.delete_many({})
    
    # Sample inventory
    inventory_items = [
        {"sku": "SKU-001", "name": "Industrial Motor A1", "category": "Motors", "quantity": 150, "min_stock": 20, "max_stock": 500, "unit_price": 450.00, "warehouse": "Warehouse A", "location": "A-12-3"},
        {"sku": "SKU-002", "name": "Steel Bearings Set", "category": "Components", "quantity": 8, "min_stock": 50, "max_stock": 1000, "unit_price": 25.50, "warehouse": "Warehouse A", "location": "A-05-1"},
        {"sku": "SKU-003", "name": "Hydraulic Pump B2", "category": "Pumps", "quantity": 45, "min_stock": 15, "max_stock": 200, "unit_price": 890.00, "warehouse": "Warehouse B", "location": "B-08-2"},
        {"sku": "SKU-004", "name": "Control Panel Unit", "category": "Electronics", "quantity": 0, "min_stock": 10, "max_stock": 100, "unit_price": 1250.00, "warehouse": "Warehouse B", "location": "B-01-1"},
        {"sku": "SKU-005", "name": "Conveyor Belt 10m", "category": "Conveyors", "quantity": 25, "min_stock": 5, "max_stock": 50, "unit_price": 320.00, "warehouse": "Warehouse A", "location": "A-20-1"},
        {"sku": "SKU-006", "name": "Pneumatic Valve Set", "category": "Components", "quantity": 200, "min_stock": 30, "max_stock": 500, "unit_price": 78.00, "warehouse": "Warehouse C", "location": "C-03-2"},
        {"sku": "SKU-007", "name": "Industrial Sensor Pack", "category": "Electronics", "quantity": 12, "min_stock": 25, "max_stock": 300, "unit_price": 156.00, "warehouse": "Warehouse A", "location": "A-15-4"},
        {"sku": "SKU-008", "name": "Gearbox Assembly", "category": "Motors", "quantity": 35, "min_stock": 10, "max_stock": 150, "unit_price": 680.00, "warehouse": "Warehouse B", "location": "B-12-1"},
    ]
    
    for item_data in inventory_items:
        item = InventoryItem(**item_data)
        doc = item.model_dump()
        doc['last_updated'] = doc['last_updated'].isoformat()
        await db.inventory.insert_one(doc)
    
    # Sample suppliers
    suppliers_data = [
        {"name": "TechParts Global", "contact_email": "sales@techparts.com", "contact_phone": "+1-555-0101", "address": "123 Industrial Blvd", "country": "USA", "risk_score": 15.0, "sla_compliance": 98.5, "on_time_delivery": 97.2, "quality_rating": 4.8},
        {"name": "Asia Components Ltd", "contact_email": "info@asiacomp.cn", "contact_phone": "+86-21-5555", "address": "456 Manufacturing Zone", "country": "China", "risk_score": 45.0, "sla_compliance": 85.0, "on_time_delivery": 82.5, "quality_rating": 4.2},
        {"name": "Euro Industrial Supply", "contact_email": "orders@euroindustrial.de", "contact_phone": "+49-30-5555", "address": "789 Industrie Str", "country": "Germany", "risk_score": 12.0, "sla_compliance": 99.2, "on_time_delivery": 98.8, "quality_rating": 4.9},
        {"name": "FastShip Logistics", "contact_email": "contact@fastship.com", "contact_phone": "+1-555-0202", "address": "321 Shipping Lane", "country": "USA", "risk_score": 78.0, "sla_compliance": 72.0, "on_time_delivery": 68.5, "quality_rating": 3.2},
        {"name": "Quality Motors Inc", "contact_email": "sales@qualitymotors.com", "contact_phone": "+1-555-0303", "address": "555 Motor Way", "country": "USA", "risk_score": 8.0, "sla_compliance": 96.0, "on_time_delivery": 94.5, "quality_rating": 4.7},
    ]
    
    supplier_ids = []
    for supplier_data in suppliers_data:
        supplier = Supplier(**supplier_data)
        doc = supplier.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        await db.suppliers.insert_one(doc)
        supplier_ids.append({"id": supplier.id, "name": supplier.name})
    
    # Sample orders
    orders_data = [
        {"order_number": "PO-2024-001", "supplier_id": supplier_ids[0]['id'], "supplier_name": supplier_ids[0]['name'], "items": [{"sku": "SKU-001", "name": "Industrial Motor A1", "quantity": 10, "unit_price": 450.00}], "total_amount": 4500.00, "status": "delivered", "expected_delivery": (datetime.now(timezone.utc) - timedelta(days=5)).isoformat()},
        {"order_number": "PO-2024-002", "supplier_id": supplier_ids[1]['id'], "supplier_name": supplier_ids[1]['name'], "items": [{"sku": "SKU-002", "name": "Steel Bearings Set", "quantity": 100, "unit_price": 25.50}], "total_amount": 2550.00, "status": "shipped", "expected_delivery": (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()},
        {"order_number": "PO-2024-003", "supplier_id": supplier_ids[2]['id'], "supplier_name": supplier_ids[2]['name'], "items": [{"sku": "SKU-003", "name": "Hydraulic Pump B2", "quantity": 5, "unit_price": 890.00}], "total_amount": 4450.00, "status": "pending", "expected_delivery": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()},
        {"order_number": "PO-2024-004", "supplier_id": supplier_ids[3]['id'], "supplier_name": supplier_ids[3]['name'], "items": [{"sku": "SKU-004", "name": "Control Panel Unit", "quantity": 20, "unit_price": 1250.00}], "total_amount": 25000.00, "status": "backorder", "expected_delivery": (datetime.now(timezone.utc) + timedelta(days=14)).isoformat()},
        {"order_number": "PO-2024-005", "supplier_id": supplier_ids[4]['id'], "supplier_name": supplier_ids[4]['name'], "items": [{"sku": "SKU-008", "name": "Gearbox Assembly", "quantity": 15, "unit_price": 680.00}], "total_amount": 10200.00, "status": "confirmed", "expected_delivery": (datetime.now(timezone.utc) + timedelta(days=5)).isoformat()},
    ]
    
    for order_data in orders_data:
        order = Order(**order_data)
        doc = order.model_dump()
        doc['order_date'] = doc['order_date'].isoformat()
        if doc.get('expected_delivery') and not isinstance(doc['expected_delivery'], str):
            doc['expected_delivery'] = doc['expected_delivery'].isoformat()
        await db.orders.insert_one(doc)
    
    # Sample forecasts
    months = ["2024-01", "2024-02", "2024-03", "2024-04", "2024-05", "2024-06"]
    forecast_items = [
        {"sku": "SKU-001", "product_name": "Industrial Motor A1", "warehouse": "Warehouse A"},
        {"sku": "SKU-003", "product_name": "Hydraulic Pump B2", "warehouse": "Warehouse B"},
    ]
    
    import random
    for item in forecast_items:
        base_demand = random.randint(50, 150)
        for month in months:
            forecast = Forecast(
                sku=item['sku'],
                product_name=item['product_name'],
                warehouse=item['warehouse'],
                period=month,
                predicted_demand=base_demand + random.randint(-20, 30),
                actual_demand=base_demand + random.randint(-15, 25) if months.index(month) < 4 else None,
                confidence=random.uniform(0.75, 0.95)
            )
            doc = forecast.model_dump()
            doc['created_at'] = doc['created_at'].isoformat()
            await db.forecasts.insert_one(doc)
    
    return {"message": "Sample data seeded successfully"}

# ======================== ROOT ROUTE ========================

@api_router.get("/")
async def root():
    return {"message": "NexusLogistics API v1.0"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
