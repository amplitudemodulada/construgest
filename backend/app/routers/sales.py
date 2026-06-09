from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime
from app.database import get_db
from app.models.user import User
from app.models.sale import Sale, SaleItem, Quote, QuoteItem, SaleStatus, PaymentMethod
from app.models.product import Product
from app.models.stock import StockMovement, MovementType
from app.models.financial import AccountReceivable, TransactionStatus
from app.models.loyalty import LoyaltyTransaction, TransactionType
from app.schemas.sale import SaleCreate, SaleResponse, QuoteCreate, QuoteResponse
from app.schemas.financial import PaymentCreate
from app.utils.auth import get_current_user_required, generate_invoice_number, generate_quote_number

router = APIRouter(prefix="/api/sales", tags=["Vendas"])

def sale_to_dict(sale):
    return {
        "id": sale.id,
        "invoice_number": sale.invoice_number,
        "customer_id": sale.customer_id,
        "user_id": sale.user_id,
        "status": sale.status.value if hasattr(sale.status, 'value') else sale.status,
        "subtotal": float(sale.subtotal),
        "discount": float(sale.discount),
        "discount_type": sale.discount_type,
        "total": float(sale.total),
        "payment_method": sale.payment_method.value if hasattr(sale.payment_method, 'value') else sale.payment_method,
        "installments": sale.installments,
        "notes": sale.notes,
        "nfe_key": sale.nfe_key,
        "nfe_status": sale.nfe_status,
        "created_at": sale.created_at,
        "customer": {"id": sale.customer.id, "name": sale.customer.name} if sale.customer else None,
        "user": {"id": sale.user.id, "full_name": sale.user.full_name} if sale.user else None,
        "items": [{
            "id": item.id,
            "product_id": item.product_id,
            "quantity": float(item.quantity),
            "unit_price": float(item.unit_price),
            "total_price": float(item.total_price),
            "product": {"id": item.product.id, "name": item.product.name, "code": item.product.code} if item.product else None
        } for item in sale.items]
    }

@router.get("/")
def list_sales(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    customer_id: Optional[int] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required)
):
    query = db.query(Sale).options(joinedload(Sale.items).joinedload(SaleItem.product), joinedload(Sale.customer), joinedload(Sale.user))
    if status:
        query = query.filter(Sale.status == status)
    if customer_id:
        query = query.filter(Sale.customer_id == customer_id)
    if start_date:
        query = query.filter(Sale.created_at >= datetime.fromisoformat(start_date))
    if end_date:
        query = query.filter(Sale.created_at <= datetime.fromisoformat(end_date))
    if search:
        query = query.filter(Sale.invoice_number.ilike(f"%{search}%"))
    sales = query.order_by(Sale.created_at.desc()).offset(skip).limit(limit).all()
    return [sale_to_dict(s) for s in sales]

@router.get("/{sale_id}")
def get_sale(sale_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_required)):
    sale = db.query(Sale).options(joinedload(Sale.items).joinedload(SaleItem.product), joinedload(Sale.customer), joinedload(Sale.user)).filter(Sale.id == sale_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Venda não encontrada")
    return sale_to_dict(sale)

@router.post("/", status_code=201)
def create_sale(data: SaleCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_required)):
    subtotal = 0
    items_data = []
    for item in data.items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail=f"Produto {item.product_id} não encontrado")
        if product.current_stock < item.quantity:
            raise HTTPException(status_code=400, detail=f"Estoque insuficiente para {product.name}")
        item_total = item.quantity * item.unit_price
        subtotal += item_total
        items_data.append({
            "product_id": item.product_id,
            "quantity": item.quantity,
            "unit_price": item.unit_price,
            "total_price": item_total
        })
    
    discount_value = 0
    if data.discount > 0:
        if data.discount_type == "percentual":
            discount_value = subtotal * (data.discount / 100)
        else:
            discount_value = data.discount
    
    total = subtotal - discount_value
    invoice = generate_invoice_number()
    
    sale = Sale(
        invoice_number=invoice,
        customer_id=data.customer_id,
        user_id=current_user.id,
        status=SaleStatus(data.status),
        subtotal=subtotal,
        discount=discount_value,
        discount_type=data.discount_type,
        total=total,
        payment_method=PaymentMethod(data.payment_method) if data.payment_method else PaymentMethod.PIX,
        installments=data.installments or 1,
        notes=data.notes
    )
    db.add(sale)
    db.flush()
    
    for item_data in items_data:
        sale_item = SaleItem(sale_id=sale.id, **item_data)
        db.add(sale_item)
        product = db.query(Product).filter(Product.id == item_data["product_id"]).first()
        product.current_stock -= item_data["quantity"]
        movement = StockMovement(
            product_id=item_data["product_id"],
            user_id=current_user.id,
            movement_type=MovementType.OUT,
            quantity=item_data["quantity"],
            unit_price=item_data["unit_price"],
            total_price=item_data["total_price"],
            reference_type="sale",
            reference_id=sale.id
        )
        db.add(movement)
    
    if data.customer_id:
        receivable = AccountReceivable(
            sale_id=sale.id,
            customer_id=data.customer_id,
            description=f"Venda {invoice}",
            original_amount=total,
            amount=total,
            due_date=datetime.now().date(),
            status=TransactionStatus.PAID if data.payment_method in ["pix", "dinheiro", "cartao_debito"] else TransactionStatus.PENDING
        )
        db.add(receivable)
    
    db.commit()
    db.refresh(sale)
    
    result = db.query(Sale).options(joinedload(Sale.items).joinedload(SaleItem.product), joinedload(Sale.customer), joinedload(Sale.user)).filter(Sale.id == sale.id).first()
    return sale_to_dict(result)

@router.put("/{sale_id}/cancel")
def cancel_sale(sale_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_required)):
    sale = db.query(Sale).options(joinedload(Sale.items)).filter(Sale.id == sale_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Venda não encontrada")
    if sale.status == SaleStatus.CANCELLED:
        raise HTTPException(status_code=400, detail="Venda já está cancelada")
    sale.status = SaleStatus.CANCELLED
    for item in sale.items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if product:
            product.current_stock += item.quantity
    db.commit()
    return {"message": "Venda cancelada com sucesso"}

# Quotes
@router.get("/quotes/list")
def list_quotes(
    status: Optional[str] = Query(None),
    customer_id: Optional[int] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required)
):
    query = db.query(Quote).options(joinedload(Quote.items).joinedload(QuoteItem.product), joinedload(Quote.customer), joinedload(Quote.user))
    if status:
        query = query.filter(Quote.status == status)
    if customer_id:
        query = query.filter(Quote.customer_id == customer_id)
    quotes = query.order_by(Quote.created_at.desc()).offset(skip).limit(limit).all()
    result = []
    for q in quotes:
        result.append({
            "id": q.id,
            "quote_number": q.quote_number,
            "customer_id": q.customer_id,
            "user_id": q.user_id,
            "status": q.status,
            "subtotal": float(q.subtotal),
            "discount": float(q.discount),
            "total": float(q.total),
            "valid_until": q.valid_until,
            "notes": q.notes,
            "created_at": q.created_at,
            "customer": {"id": q.customer.id, "name": q.customer.name} if q.customer else None,
            "items": [{
                "id": item.id,
                "product_id": item.product_id,
                "quantity": float(item.quantity),
                "unit_price": float(item.unit_price),
                "total_price": float(item.total_price),
                "product": {"id": item.product.id, "name": item.product.name, "code": item.product.code} if item.product else None
            } for item in q.items]
        })
    return result

@router.post("/quotes", status_code=201)
def create_quote(data: QuoteCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_required)):
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
    
    discount_value = data.discount if data.discount else 0
    total = subtotal - discount_value
    
    quote = Quote(
        quote_number=generate_quote_number(),
        customer_id=data.customer_id,
        user_id=current_user.id,
        subtotal=subtotal,
        discount=discount_value,
        total=total,
        valid_until=data.valid_until,
        notes=data.notes
    )
    db.add(quote)
    db.flush()
    
    for item_data in items_data:
        qi = QuoteItem(quote_id=quote.id, **item_data)
        db.add(qi)
    
    db.commit()
    db.refresh(quote)
    return {"id": quote.id, "quote_number": quote.quote_number, "total": float(total), "status": quote.status}

@router.post("/{sale_id}/pay")
def register_payment(sale_id: int, data: PaymentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_required)):
    sale = db.query(Sale).filter(Sale.id == sale_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Venda não encontrada")
    if sale.status == SaleStatus.CANCELLED:
        raise HTTPException(status_code=400, detail="Venda cancelada não pode receber pagamento")
    
    from app.models.financial import Payment
    payment = Payment(
        sale_id=sale_id,
        customer_id=data.customer_id,
        amount=data.amount,
        payment_method=data.payment_method,
        installments=data.installments,
        transaction_id=data.transaction_id,
        paid_at=datetime.now(),
        notes=data.notes
    )
    db.add(payment)
    
    receivable = db.query(AccountReceivable).filter(AccountReceivable.sale_id == sale_id).first()
    if receivable:
        receivable.paid_amount = (receivable.paid_amount or 0) + data.amount
        receivable.paid_at = datetime.now()
        if receivable.paid_amount >= receivable.amount:
            receivable.status = TransactionStatus.PAID
    
    db.commit()
    return {"message": "Pagamento registrado com sucesso", "amount": data.amount}
