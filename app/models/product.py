from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, Numeric
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    barcode = Column(String(100), unique=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    unit = Column(String(20), default="UN")
    cost_price = Column(Numeric(12, 2), nullable=False, default=0)
    selling_price = Column(Numeric(12, 2), nullable=False, default=0)
    min_stock = Column(Numeric(12, 3), default=0)
    current_stock = Column(Numeric(12, 3), default=0)
    max_stock = Column(Numeric(12, 3), default=0)
    location = Column(String(50))
    ncm_code = Column(String(10))
    cest_code = Column(String(10))
    is_active = Column(Boolean, default=True)
    image = Column(String(255))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    category = relationship("Category", backref="products")
