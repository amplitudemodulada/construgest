from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date

class AccountReceivableBase(BaseModel):
    customer_id: Optional[int] = None
    description: str
    original_amount: float
    amount: float
    due_date: date
    notes: Optional[str] = None

class AccountReceivableCreate(AccountReceivableBase):
    sale_id: Optional[int] = None

class AccountReceivableResponse(AccountReceivableBase):
    id: int
    sale_id: Optional[int]
    paid_amount: float
    paid_at: Optional[datetime]
    status: str
    payment_method: Optional[str]
    created_at: Optional[datetime]
    class Config: from_attributes = True

class AccountPayableBase(BaseModel):
    supplier_id: Optional[int] = None
    description: str
    original_amount: float
    amount: float
    due_date: date
    notes: Optional[str] = None

class AccountPayableCreate(AccountPayableBase):
    purchase_order_id: Optional[int] = None

class AccountPayableResponse(AccountPayableBase):
    id: int
    purchase_order_id: Optional[int]
    paid_amount: float
    paid_at: Optional[datetime]
    status: str
    payment_method: Optional[str]
    created_at: Optional[datetime]
    class Config: from_attributes = True

class PaymentCreate(BaseModel):
    sale_id: Optional[int] = None
    customer_id: Optional[int] = None
    amount: float
    payment_method: str
    installments: int = 1
    transaction_id: Optional[str] = None
    notes: Optional[str] = None
