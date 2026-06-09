from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date

class PurchaseOrderItemBase(BaseModel):
    product_id: int
    quantity: float
    unit_price: float

class PurchaseOrderItemCreate(PurchaseOrderItemBase): pass

class PurchaseOrderItemResponse(PurchaseOrderItemBase):
    id: int
    received_quantity: float
    total_price: float
    product: Optional[dict] = None
    class Config: from_attributes = True

class PurchaseOrderBase(BaseModel):
    supplier_id: int
    discount: float = 0
    shipping_cost: float = 0
    expected_date: Optional[date] = None
    notes: Optional[str] = None

class PurchaseOrderCreate(PurchaseOrderBase):
    items: List[PurchaseOrderItemCreate]

class PurchaseOrderResponse(PurchaseOrderBase):
    id: int
    order_number: Optional[str]
    user_id: int
    status: str
    subtotal: float
    total: float
    received_date: Optional[date]
    items: List[PurchaseOrderItemResponse] = []
    created_at: Optional[datetime]
    class Config: from_attributes = True
