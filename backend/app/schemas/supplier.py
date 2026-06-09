from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class SupplierBase(BaseModel):
    company_name: str
    trade_name: Optional[str] = None
    cnpj: Optional[str] = None
    ie: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    cellphone: Optional[str] = None
    zip_code: Optional[str] = None
    address: Optional[str] = None
    number: Optional[str] = None
    complement: Optional[str] = None
    neighborhood: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    website: Optional[str] = None
    contact_name: Optional[str] = None
    notes: Optional[str] = None
    payment_terms: Optional[str] = None
    delivery_days: Optional[int] = 30

class SupplierCreate(SupplierBase): pass

class SupplierUpdate(BaseModel):
    company_name: Optional[str] = None
    trade_name: Optional[str] = None
    cnpj: Optional[str] = None
    ie: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    cellphone: Optional[str] = None
    zip_code: Optional[str] = None
    address: Optional[str] = None
    number: Optional[str] = None
    complement: Optional[str] = None
    neighborhood: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    website: Optional[str] = None
    contact_name: Optional[str] = None
    notes: Optional[str] = None
    payment_terms: Optional[str] = None
    delivery_days: Optional[int] = None

class SupplierResponse(SupplierBase):
    id: int
    is_active: bool
    created_at: Optional[datetime] = None
    class Config: from_attributes = True
