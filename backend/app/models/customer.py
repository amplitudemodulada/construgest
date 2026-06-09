from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Date, Enum
from sqlalchemy.sql import func
from app.database import Base
import enum

class CustomerType(str, enum.Enum):
    PF = "pf"
    PJ = "pj"

class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    customer_type = Column(Enum(CustomerType), nullable=False)
    name = Column(String(200), nullable=False)
    company_name = Column(String(200))
    document = Column(String(20), unique=True, index=True)
    ie_rg = Column(String(20))
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
    notes = Column(Text)
    is_active = Column(Boolean, default=True)
    credit_limit = Column(Integer, default=0)
    birth_date = Column(Date)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
