from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.user import User
from app.models.supplier import Supplier
from app.schemas.supplier import SupplierCreate, SupplierUpdate, SupplierResponse
from app.utils.auth import get_current_user_required

router = APIRouter(prefix="/api/suppliers", tags=["Fornecedores"])


@router.get("/", response_model=List[SupplierResponse])
def list_suppliers(
    search: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(True),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    query = db.query(Supplier).filter(Supplier.is_active == is_active)
    if search:
        query = query.filter(
            Supplier.company_name.ilike(f"%{search}%")
            | Supplier.cnpj.ilike(f"%{search}%")
            | Supplier.city.ilike(f"%{search}%")
        )
    suppliers = query.offset(skip).limit(limit).all()
    return suppliers


@router.get("/{supplier_id}", response_model=SupplierResponse)
def get_supplier(
    supplier_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Fornecedor não encontrado")
    return supplier


@router.post("/", response_model=SupplierResponse, status_code=201)
def create_supplier(
    data: SupplierCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    if data.cnpj:
        existing = db.query(Supplier).filter(Supplier.cnpj == data.cnpj).first()
        if existing:
            raise HTTPException(status_code=400, detail="CNPJ já cadastrado")
    supplier = Supplier(**data.model_dump())
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier


@router.put("/{supplier_id}", response_model=SupplierResponse)
def update_supplier(
    supplier_id: int,
    data: SupplierUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Fornecedor não encontrado")
    update_data = data.model_dump(exclude_unset=True)
    if "cnpj" in update_data and update_data["cnpj"]:
        existing = (
            db.query(Supplier)
            .filter(Supplier.cnpj == update_data["cnpj"], Supplier.id != supplier_id)
            .first()
        )
        if existing:
            raise HTTPException(status_code=400, detail="CNPJ já cadastrado")
    for key, value in update_data.items():
        setattr(supplier, key, value)
    db.commit()
    db.refresh(supplier)
    return supplier


@router.delete("/{supplier_id}", status_code=204)
def delete_supplier(
    supplier_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Fornecedor não encontrado")
    supplier.is_active = False
    db.commit()
