from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None

class CategoryCreate(CategoryBase): pass

class CategoryResponse(CategoryBase):
    id: int
    is_active: bool
    created_at: Optional[datetime] = None
    class Config: from_attributes = True

class ProductBase(BaseModel):
    code: str
    barcode: Optional[str] = None
    name: str
    description: Optional[str] = None
    category_id: int
    unit: str = "UN"
    cost_price: float = 0
    selling_price: float = 0
    min_stock: float = 0
    current_stock: float = 0
    max_stock: float = 0
    location: Optional[str] = None
    ncm_code: Optional[str] = None
    cest_code: Optional[str] = None

class ProductCreate(ProductBase): pass

class ProductUpdate(BaseModel):
    code: Optional[str] = None
    barcode: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[int] = None
    unit: Optional[str] = None
    cost_price: Optional[float] = None
    selling_price: Optional[float] = None
    min_stock: Optional[float] = None
    max_stock: Optional[float] = None
    location: Optional[str] = None
    ncm_code: Optional[str] = None
    cest_code: Optional[str] = None

class ProductResponse(ProductBase):
    id: int
    is_active: bool
    category: Optional[CategoryResponse] = None
    created_at: Optional[datetime] = None
    class Config: from_attributes = True
