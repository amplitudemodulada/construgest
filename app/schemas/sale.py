from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class SaleItemBase(BaseModel):
    product_id: int
    quantity: float
    unit_price: float
    total_price: float

class SaleItemCreate(SaleItemBase): pass

class SaleItemResponse(SaleItemBase):
    id: int
    product: Optional[dict] = None
    class Config: from_attributes = True

class SaleBase(BaseModel):
    customer_id: Optional[int] = None
    status: str = "confirmado"
    payment_method: str = "pix"
    installments: int = 1
    notes: Optional[str] = None
    discount: float = 0
    discount_type: str = "percentual"

class SaleCreate(SaleBase):
    items: List[SaleItemCreate]

class SaleResponse(SaleBase):
    id: int
    invoice_number: Optional[str] = None
    user_id: int
    subtotal: float
    total: float
    nfe_key: Optional[str] = None
    nfe_status: Optional[str] = None
    customer: Optional[dict] = None
    user: Optional[dict] = None
    items: List[SaleItemResponse] = []
    created_at: Optional[datetime] = None
    class Config: from_attributes = True

class QuoteItemBase(BaseModel):
    product_id: int
    quantity: float
    unit_price: float
    total_price: float

class QuoteItemCreate(QuoteItemBase): pass

class QuoteBase(BaseModel):
    customer_id: Optional[int] = None
    discount: float = 0
    valid_until: Optional[datetime] = None
    notes: Optional[str] = None

class QuoteCreate(QuoteBase):
    items: List[QuoteItemCreate]

class QuoteResponse(BaseModel):
    id: int
    quote_number: Optional[str]
    customer_id: Optional[int]
    user_id: int
    status: str
    subtotal: float
    discount: float
    total: float
    valid_until: Optional[datetime]
    notes: Optional[str]
    items: List[dict] = []
    created_at: Optional[datetime]
    class Config: from_attributes = True
