from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date

class CustomerBase(BaseModel):
    customer_type: str = "pf"
    name: str
    company_name: Optional[str] = None
    document: Optional[str] = None
    ie_rg: Optional[str] = None
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
    notes: Optional[str] = None
    credit_limit: Optional[int] = 0
    birth_date: Optional[date] = None

class CustomerCreate(CustomerBase): pass

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    company_name: Optional[str] = None
    document: Optional[str] = None
    ie_rg: Optional[str] = None
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
    notes: Optional[str] = None
    credit_limit: Optional[int] = None
    birth_date: Optional[date] = None

class CustomerResponse(CustomerBase):
    id: int
    is_active: bool
    created_at: Optional[datetime] = None
    class Config: from_attributes = True
