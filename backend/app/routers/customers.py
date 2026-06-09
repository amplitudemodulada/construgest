from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.user import User, UserRole
from app.models.customer import Customer
from app.schemas.customer import CustomerCreate, CustomerUpdate, CustomerResponse
from app.utils.auth import get_current_user_required

router = APIRouter(prefix="/api/customers", tags=["Clientes"])


@router.get("/", response_model=List[CustomerResponse])
def list_customers(
    search: Optional[str] = Query(None),
    customer_type: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(True),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    query = db.query(Customer).filter(Customer.is_active == is_active)
    if search:
        query = query.filter(
            Customer.name.ilike(f"%{search}%")
            | Customer.document.ilike(f"%{search}%")
            | Customer.email.ilike(f"%{search}%")
            | Customer.city.ilike(f"%{search}%")
        )
    if customer_type:
        query = query.filter(Customer.customer_type == customer_type)
    customers = query.offset(skip).limit(limit).all()
    return customers


@router.get("/{customer_id}", response_model=CustomerResponse)
def get_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    return customer


@router.post("/", response_model=CustomerResponse, status_code=201)
def create_customer(
    data: CustomerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    if data.document:
        existing = db.query(Customer).filter(Customer.document == data.document).first()
        if existing:
            raise HTTPException(status_code=400, detail="Documento já cadastrado")
    customer = Customer(**data.model_dump())
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


@router.put("/{customer_id}", response_model=CustomerResponse)
def update_customer(
    customer_id: int,
    data: CustomerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    update_data = data.model_dump(exclude_unset=True)
    if "document" in update_data and update_data["document"]:
        existing = (
            db.query(Customer)
            .filter(Customer.document == update_data["document"], Customer.id != customer_id)
            .first()
        )
        if existing:
            raise HTTPException(status_code=400, detail="Documento já cadastrado")
    for key, value in update_data.items():
        setattr(customer, key, value)
    db.commit()
    db.refresh(customer)
    return customer


@router.delete("/{customer_id}", status_code=204)
def delete_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    customer.is_active = False
    db.commit()
