from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.sql import func
from app.database import Base

class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String(200), nullable=False)
    trade_name = Column(String(200))
    cnpj = Column(String(20), unique=True, index=True)
    ie = Column(String(20))
    email = Column(String(100))
    phone = Column(String(20))
    cellphone = Column(String(20))
    zip_code = Column(String(10))
    address = Column(String(255))
    number = Column(String(20))
    complement = Column(String(100))
    neighborhood = Column(String(100))
    city = Column(String(100))
    state = Column(String(2))
    website = Column(String(255))
    contact_name = Column(String(100))
    notes = Column(Text)
    payment_terms = Column(String(255))
    delivery_days = Column(Integer, default=30)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
