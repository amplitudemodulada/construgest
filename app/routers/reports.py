from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, extract
from typing import Optional
from datetime import datetime, date, timedelta
from app.database import get_db
from app.models.user import User
from app.models.sale import Sale, SaleItem
from app.models.product import Product
from app.models.customer import Customer
from app.models.financial import AccountReceivable, AccountPayable, TransactionStatus
from app.utils.auth import get_current_user_required

router = APIRouter(prefix="/api/reports", tags=["Relatórios"])

@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user_required)):
    today = date.today()
    month_start = today.replace(day=1)
    year_start = today.replace(month=1, day=1)
    
    sales_today = db.query(func.coalesce(func.sum(Sale.total), 0)).filter(
        func.date(Sale.created_at) == today,
        Sale.status != "cancelado"
    ).scalar()
    
    sales_month = db.query(func.coalesce(func.sum(Sale.total), 0)).filter(
        func.date(Sale.created_at) >= month_start,
        Sale.status != "cancelado"
    ).scalar()
    
    sales_year = db.query(func.coalesce(func.sum(Sale.total), 0)).filter(
        func.date(Sale.created_at) >= year_start,
        Sale.status != "cancelado"
    ).scalar()
    
    total_customers = db.query(func.count(Customer.id)).filter(Customer.is_active == True).scalar()
    total_products = db.query(func.count(Product.id)).filter(Product.is_active == True).scalar()
    low_stock_count = db.query(func.count(Product.id)).filter(
        Product.is_active == True,
        Product.current_stock <= Product.min_stock
    ).scalar()
    
    pending_receivable = db.query(func.coalesce(func.sum(AccountReceivable.amount - AccountReceivable.paid_amount), 0)).filter(
        AccountReceivable.status == TransactionStatus.PENDING
    ).scalar()
    
    overdue_receivable = db.query(func.coalesce(func.sum(AccountReceivable.amount - AccountReceivable.paid_amount), 0)).filter(
        AccountReceivable.status == TransactionStatus.OVERDUE
    ).scalar()
    
    pending_payable = db.query(func.coalesce(func.sum(AccountPayable.amount - AccountPayable.paid_amount), 0)).filter(
        AccountPayable.status == TransactionStatus.PENDING
    ).scalar()
    
    sales_by_period = []
    for i in range(6, -1, -1):
        d = today - timedelta(days=i)
        total = db.query(func.coalesce(func.sum(Sale.total), 0)).filter(
            func.date(Sale.created_at) == d,
            Sale.status != "cancelado"
        ).scalar()
        sales_by_period.append({"date": str(d), "total": float(total)})
    
    sales_by_category = db.query(
        func.coalesce(func.sum(SaleItem.total_price), 0).label("total"),
        Product.category_id
    ).join(SaleItem.product).join(Sale).filter(
        Sale.status != "cancelado"
    ).group_by(Product.category_id).all()
    
    from app.models.category import Category
    sales_cat_result = []
    for row in sales_by_category:
        cat = db.query(Category).filter(Category.id == row.category_id).first()
        sales_cat_result.append({
            "category": cat.name if cat else "Sem categoria",
            "total": float(row.total)
        })
    
    top_products = db.query(
        Product.name,
        func.sum(SaleItem.quantity).label("quantity"),
        func.sum(SaleItem.total_price).label("total")
    ).join(SaleItem.product).join(Sale).filter(
        Sale.status != "cancelado"
    ).group_by(Product.id, Product.name).order_by(func.sum(SaleItem.total_price).desc()).limit(10).all()
    
    top_prod_result = [{"name": p.name, "quantity": float(p.quantity), "total": float(p.total)} for p in top_products]
    
    recent_sales = db.query(Sale).options(
        joinedload(Sale.customer), joinedload(Sale.user)
    ).filter(Sale.status != "cancelado").order_by(Sale.created_at.desc()).limit(10).all()
    
    recent_result = []
    for s in recent_sales:
        recent_result.append({
            "id": s.id,
            "invoice_number": s.invoice_number,
            "customer_name": s.customer.name if s.customer else "Consumidor",
            "user_name": s.user.full_name if s.user else "",
            "total": float(s.total),
            "payment_method": s.payment_method.value if hasattr(s.payment_method, 'value') else s.payment_method,
            "created_at": s.created_at
        })
    
    return {
        "total_sales_today": float(sales_today),
        "total_sales_month": float(sales_month),
        "total_sales_year": float(sales_year),
        "total_customers": total_customers,
        "total_products": total_products,
        "low_stock_count": low_stock_count,
        "pending_receivable": float(pending_receivable),
        "overdue_receivable": float(overdue_receivable),
        "pending_payable": float(pending_payable),
        "sales_by_period": sales_by_period,
        "sales_by_category": sales_cat_result,
        "top_products": top_prod_result,
        "recent_sales": recent_result
    }

@router.get("/sales")
def sales_report(
    start_date: str = Query(None),
    end_date: str = Query(None),
    category_id: Optional[int] = Query(None),
    product_id: Optional[int] = Query(None),
    group_by: str = Query("day"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required)
):
    s_date = date.fromisoformat(start_date) if start_date else date.today() - timedelta(days=30)
    e_date = date.fromisoformat(end_date) if end_date else date.today()
    
    query = db.query(
        Sale,
        SaleItem,
        Product
    ).join(SaleItem).join(Product).filter(
        func.date(Sale.created_at).between(s_date, e_date),
        Sale.status != "cancelado"
    )
    
    if category_id:
        query = query.filter(Product.category_id == category_id)
    if product_id:
        query = query.filter(Product.id == product_id)
    
    results = query.all()
    
    total_sales = sum(float(r.Sale.total) for r in set(r.Sale.id for r in results)) if results else 0
    total_items = sum(float(r.SaleItem.quantity) for r in results)
    avg_ticket = total_sales / (len(set(r.Sale.id for r in results)) or 1)
    
    sales_by_day = {}
    for r in results:
        day_key = str(r.Sale.created_at.date())
        if day_key not in sales_by_day:
            sales_by_day[day_key] = {"date": day_key, "total": 0, "count": 0}
        sales_by_day[day_key]["total"] += float(r.SaleItem.total_price)
        sales_by_day[day_key]["count"] += 1
    
    return {
        "period": {"start": str(s_date), "end": str(e_date)},
        "summary": {
            "total_sales": float(total_sales),
            "total_items": float(total_items),
            "avg_ticket": float(avg_ticket),
            "total_transactions": len(set(r.Sale.id for r in results))
        },
        "sales_by_period": sorted(sales_by_day.values(), key=lambda x: x["date"])
    }

@router.get("/products")
def product_report(
    category_id: Optional[int] = Query(None),
    low_stock: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required)
):
    query = db.query(Product).filter(Product.is_active == True)
    if category_id:
        query = query.filter(Product.category_id == category_id)
    if low_stock:
        query = query.filter(Product.current_stock <= Product.min_stock)
    
    products = query.all()
    total_inventory_value = sum(float(p.cost_price * p.current_stock) for p in products)
    total_sales_value = sum(float(p.selling_price * p.current_stock) for p in products)
    
    return {
        "total_products": len(products),
        "total_inventory_value": float(total_inventory_value),
        "total_sales_value": float(total_sales_value),
        "potential_profit": float(total_sales_value - total_inventory_value),
        "low_stock_count": sum(1 for p in products if p.current_stock <= p.min_stock),
        "products": [{
            "id": p.id,
            "code": p.code,
            "name": p.name,
            "current_stock": float(p.current_stock),
            "min_stock": float(p.min_stock),
            "cost_price": float(p.cost_price),
            "selling_price": float(p.selling_price),
            "profit_margin": float(((p.selling_price - p.cost_price) / p.cost_price * 100) if p.cost_price > 0 else 0)
        } for p in products]
    }
