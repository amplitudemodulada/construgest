from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime, date

class ReportFilter(BaseModel):
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    category_id: Optional[int] = None
    product_id: Optional[int] = None
    customer_id: Optional[int] = None
    supplier_id: Optional[int] = None
    user_id: Optional[int] = None
    period: Optional[str] = "monthly"  # daily, monthly, yearly

class DashboardData(BaseModel):
    total_sales_today: float
    total_sales_month: float
    total_sales_year: float
    total_customers: int
    total_products: int
    low_stock_count: int
    pending_receivable: float
    overdue_receivable: float
    pending_payable: float
    sales_by_period: List[dict]
    sales_by_category: List[dict]
    top_products: List[dict]
    recent_sales: List[dict]
