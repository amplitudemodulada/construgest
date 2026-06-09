from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class StockMovementCreate(BaseModel):
    product_id: int
    movement_type: str
    quantity: float
    unit_price: Optional[float] = None
    notes: Optional[str] = None

class StockMovementResponse(BaseModel):
    id: int
    product_id: int
    user_id: int
    movement_type: str
    quantity: float
    unit_price: Optional[float]
    total_price: Optional[float]
    reference_type: Optional[str]
    reference_id: Optional[int]
    notes: Optional[str]
    created_at: Optional[datetime]
    product: Optional[dict] = None
    class Config: from_attributes = True
