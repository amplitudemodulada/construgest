from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime, date
from app.database import get_db
from app.models.user import User
from app.models.financial import AccountReceivable, AccountPayable, TransactionStatus
from app.schemas.financial import AccountReceivableCreate, AccountReceivableResponse, AccountPayableCreate, AccountPayableResponse
from app.utils.auth import get_current_user_required

router = APIRouter(prefix="/api/financial", tags=["Financeiro"])

# Accounts Receivable
@router.get("/receivable")
def list_receivables(
    status: Optional[str] = Query(None),
    customer_id: Optional[int] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required)
):
    query = db.query(AccountReceivable).options(joinedload(AccountReceivable.customer))
    if status:
        query = query.filter(AccountReceivable.status == status)
    if customer_id:
        query = query.filter(AccountReceivable.customer_id == customer_id)
    if start_date:
        query = query.filter(AccountReceivable.due_date >= date.fromisoformat(start_date))
    if end_date:
        query = query.filter(AccountReceivable.due_date <= date.fromisoformat(end_date))
    items = query.order_by(AccountReceivable.due_date.asc()).offset(skip).limit(limit).all()
    result = []
    for item in items:
        result.append({
            "id": item.id,
            "sale_id": item.sale_id,
            "customer_id": item.customer_id,
            "description": item.description,
            "original_amount": float(item.original_amount),
            "amount": float(item.amount),
            "paid_amount": float(item.paid_amount),
            "due_date": str(item.due_date),
            "paid_at": item.paid_at,
            "status": item.status.value if hasattr(item.status, 'value') else item.status,
            "payment_method": item.payment_method,
            "notes": item.notes,
            "created_at": item.created_at,
            "customer": {"id": item.customer.id, "name": item.customer.name} if item.customer else None
        })
    return result

@router.post("/receivable", status_code=201)
def create_receivable(data: AccountReceivableCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_required)):
    item = AccountReceivable(**data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.post("/receivable/{receivable_id}/pay")
def pay_receivable(receivable_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_required)):
    item = db.query(AccountReceivable).filter(AccountReceivable.id == receivable_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Conta a receber não encontrada")
    item.paid_amount = item.amount
    item.paid_at = datetime.now()
    item.status = TransactionStatus.PAID
    db.commit()
    return {"message": "Conta recebida com sucesso"}

# Accounts Payable
@router.get("/payable")
def list_payables(
    status: Optional[str] = Query(None),
    supplier_id: Optional[int] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required)
):
    query = db.query(AccountPayable).options(joinedload(AccountPayable.supplier))
    if status:
        query = query.filter(AccountPayable.status == status)
    if supplier_id:
        query = query.filter(AccountPayable.supplier_id == supplier_id)
    if start_date:
        query = query.filter(AccountPayable.due_date >= date.fromisoformat(start_date))
    if end_date:
        query = query.filter(AccountPayable.due_date <= date.fromisoformat(end_date))
    items = query.order_by(AccountPayable.due_date.asc()).offset(skip).limit(limit).all()
    result = []
    for item in items:
        result.append({
            "id": item.id,
            "supplier_id": item.supplier_id,
            "purchase_order_id": item.purchase_order_id,
            "description": item.description,
            "original_amount": float(item.original_amount),
            "amount": float(item.amount),
            "paid_amount": float(item.paid_amount),
            "due_date": str(item.due_date),
            "paid_at": item.paid_at,
            "status": item.status.value if hasattr(item.status, 'value') else item.status,
            "payment_method": item.payment_method,
            "notes": item.notes,
            "created_at": item.created_at,
            "supplier": {"id": item.supplier.id, "company_name": item.supplier.company_name} if item.supplier else None
        })
    return result

@router.post("/payable", status_code=201)
def create_payable(data: AccountPayableCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_required)):
    item = AccountPayable(**data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.post("/payable/{payable_id}/pay")
def pay_payable(payable_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_required)):
    item = db.query(AccountPayable).filter(AccountPayable.id == payable_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Conta a pagar não encontrada")
    item.paid_amount = item.amount
    item.paid_at = datetime.now()
    item.status = TransactionStatus.PAID
    db.commit()
    return {"message": "Conta paga com sucesso"}

# Cash Flow Summary
@router.get("/cash-flow")
def cash_flow(
    start_date: str = Query(None),
    end_date: str = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required)
):
    s_date = date.fromisoformat(start_date) if start_date else date.today().replace(day=1)
    e_date = date.fromisoformat(end_date) if end_date else date.today()
    
    receivables = db.query(AccountReceivable).filter(
        AccountReceivable.due_date.between(s_date, e_date)
    ).all()
    
    payables = db.query(AccountPayable).filter(
        AccountPayable.due_date.between(s_date, e_date)
    ).all()
    
    total_receivable = sum(float(r.amount) for r in receivables)
    total_received = sum(float(r.paid_amount) for r in receivables if r.paid_amount)
    total_payable = sum(float(p.amount) for p in payables)
    total_paid = sum(float(p.paid_amount) for p in payables if p.paid_amount)
    
    return {
        "period": {"start": str(s_date), "end": str(e_date)},
        "receivable": {
            "total": total_receivable,
            "received": total_received,
            "pending": total_receivable - total_received
        },
        "payable": {
            "total": total_payable,
            "paid": total_paid,
            "pending": total_payable - total_paid
        },
        "balance": {
            "projected": total_receivable - total_payable,
            "actual": total_received - total_paid
        }
    }
