from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime, date
from app.database import get_db
from app.models.user import User
from app.models.purchase import PurchaseOrder, PurchaseOrderItem, PurchaseStatus
from app.models.product import Product
from app.models.stock import StockMovement, MovementType
from app.models.financial import AccountPayable, TransactionStatus
from app.schemas.purchase import PurchaseOrderCreate
from app.utils.auth import get_current_user_required, generate_order_number

router = APIRouter(prefix="/api/purchases", tags=["Compras"])

def purchase_to_dict(order):
    return {
        "id": order.id,
        "order_number": order.order_number,
        "supplier_id": order.supplier_id,
        "user_id": order.user_id,
        "status": order.status.value if hasattr(order.status, 'value') else order.status,
        "subtotal": float(order.subtotal),
        "discount": float(order.discount),
        "shipping_cost": float(order.shipping_cost),
        "total": float(order.total),
        "expected_date": str(order.expected_date) if order.expected_date else None,
        "received_date": str(order.received_date) if order.received_date else None,
        "notes": order.notes,
        "created_at": order.created_at,
        "supplier": {"id": order.supplier.id, "company_name": order.supplier.company_name} if order.supplier else None,
        "user": {"id": order.user.id, "full_name": order.user.full_name} if order.user else None,
        "items": [{
            "id": item.id,
            "product_id": item.product_id,
            "quantity": float(item.quantity),
            "received_quantity": float(item.received_quantity),
            "unit_price": float(item.unit_price),
            "total_price": float(item.total_price),
            "product": {"id": item.product.id, "name": item.product.name, "code": item.product.code} if item.product else None
        } for item in order.items]
    }

@router.get("/")
def list_purchases(
    status: Optional[str] = Query(None),
    supplier_id: Optional[int] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required)
):
    query = db.query(PurchaseOrder).options(
        joinedload(PurchaseOrder.items).joinedload(PurchaseOrderItem.product),
        joinedload(PurchaseOrder.supplier),
        joinedload(PurchaseOrder.user)
    )
    if status:
        query = query.filter(PurchaseOrder.status == status)
    if supplier_id:
        query = query.filter(PurchaseOrder.supplier_id == supplier_id)
    if start_date:
        query = query.filter(PurchaseOrder.created_at >= datetime.fromisoformat(start_date))
    if end_date:
        query = query.filter(PurchaseOrder.created_at <= datetime.fromisoformat(end_date))
    orders = query.order_by(PurchaseOrder.created_at.desc()).offset(skip).limit(limit).all()
    return [purchase_to_dict(o) for o in orders]

@router.get("/{order_id}")
def get_purchase(order_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_required)):
    order = db.query(PurchaseOrder).options(
        joinedload(PurchaseOrder.items).joinedload(PurchaseOrderItem.product),
        joinedload(PurchaseOrder.supplier),
        joinedload(PurchaseOrder.user)
    ).filter(PurchaseOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    return purchase_to_dict(order)

@router.post("/", status_code=201)
def create_purchase(data: PurchaseOrderCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_required)):
    subtotal = 0
    items_data = []
    for item in data.items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail=f"Produto {item.product_id} não encontrado")
        item_total = item.quantity * item.unit_price
        subtotal += item_total
        items_data.append({
            "product_id": item.product_id,
            "quantity": item.quantity,
            "unit_price": item.unit_price,
            "total_price": item_total
        })
    
    total = subtotal - (data.discount or 0) + (data.shipping_cost or 0)
    
    order = PurchaseOrder(
        order_number=generate_order_number(),
        supplier_id=data.supplier_id,
        user_id=current_user.id,
        subtotal=subtotal,
        discount=data.discount or 0,
        shipping_cost=data.shipping_cost or 0,
        total=total,
        expected_date=data.expected_date,
        notes=data.notes
    )
    db.add(order)
    db.flush()
    
    for item_data in items_data:
        poi = PurchaseOrderItem(purchase_order_id=order.id, **item_data)
        db.add(poi)
    
    payable = AccountPayable(
        supplier_id=data.supplier_id,
        purchase_order_id=order.id,
        description=f"Pedido de compra {order.order_number}",
        original_amount=total,
        amount=total,
        due_date=data.expected_date or date.today().replace(day=date.today().day + 30),
        status=TransactionStatus.PENDING
    )
    db.add(payable)
    
    db.commit()
    db.refresh(order)
    return purchase_to_dict(order)

@router.put("/{order_id}/receive")
def receive_purchase(order_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_required)):
    order = db.query(PurchaseOrder).options(
        joinedload(PurchaseOrder.items).joinedload(PurchaseOrderItem.product)
    ).filter(PurchaseOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    
    for item in order.items:
        product = item.product
        if not product:
            continue
        quantity_to_add = item.quantity - item.received_quantity
        if quantity_to_add > 0:
            product.current_stock += quantity_to_add
            item.received_quantity = item.quantity
            movement = StockMovement(
                product_id=item.product_id,
                user_id=current_user.id,
                movement_type=MovementType.IN,
                quantity=quantity_to_add,
                unit_price=item.unit_price,
                total_price=quantity_to_add * item.unit_price,
                reference_type="purchase",
                reference_id=order.id
            )
            db.add(movement)
    
    order.status = PurchaseStatus.RECEIVED
    order.received_date = date.today()
    db.commit()
    return {"message": "Pedido recebido com sucesso"}

@router.put("/{order_id}/cancel")
def cancel_purchase(order_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_required)):
    order = db.query(PurchaseOrder).filter(PurchaseOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    order.status = PurchaseStatus.CANCELLED
    db.commit()
    return {"message": "Pedido cancelado com sucesso"}
