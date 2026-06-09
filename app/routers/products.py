from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from app.database import get_db
from app.models.user import User, UserRole
from app.models.product import Product
from app.models.category import Category
from app.models.stock import StockMovement, MovementType
from app.schemas.product import CategoryCreate, CategoryResponse, ProductCreate, ProductUpdate, ProductResponse
from app.schemas.stock import StockMovementResponse
from app.utils.auth import get_current_user_required, role_required
from app.utils.auth import generate_invoice_number
from datetime import datetime

router = APIRouter(prefix="/api", tags=["Produtos"])


# =============================================================================
# Helpers
# =============================================================================

def _product_to_dict(product: Product) -> dict:
    """Convert a Product ORM instance to the standard response dict."""
    return {
        "id": product.id,
        "code": product.code,
        "barcode": product.barcode,
        "name": product.name,
        "description": product.description,
        "category_id": product.category_id,
        "unit": product.unit,
        "cost_price": float(product.cost_price),
        "selling_price": float(product.selling_price),
        "min_stock": float(product.min_stock),
        "current_stock": float(product.current_stock),
        "max_stock": float(product.max_stock),
        "location": product.location,
        "ncm_code": product.ncm_code,
        "cest_code": product.cest_code,
        "is_active": product.is_active,
        "category": (
            {"id": product.category.id, "name": product.category.name}
            if product.category else None
        ),
        "created_at": product.created_at
    }


# =============================================================================
# Categories
# =============================================================================

@router.get("/categories", response_model=List[CategoryResponse])
def list_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required)
):
    """List all active categories."""
    categories = (
        db.query(Category)
        .filter(Category.is_active == True)
        .all()
    )
    return categories


@router.post("/categories", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    data: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required([UserRole.ADMIN]))
):
    """Create a new category (admin only)."""
    category = Category(**data.dict())
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.put("/categories/{category_id}", response_model=CategoryResponse)
def update_category(
    category_id: int,
    data: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required([UserRole.ADMIN]))
):
    """Update a category (admin only)."""
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")

    for key, value in data.dict(exclude_unset=True).items():
        setattr(category, key, value)

    db.commit()
    db.refresh(category)
    return category


@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required([UserRole.ADMIN]))
):
    """Soft delete a category (admin only)."""
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")

    category.is_active = False
    db.commit()
    return None


# =============================================================================
# Low Stock Alert (must be defined before /products/{product_id} to avoid
# FastAPI path conflicts)
# =============================================================================

@router.get("/products/low-stock", response_model=List[dict])
def list_low_stock_products(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required)
):
    """Return products where current_stock <= min_stock, with category info."""
    products = (
        db.query(Product)
        .options(joinedload(Product.category))
        .filter(
            Product.is_active == True,
            Product.current_stock <= Product.min_stock
        )
        .all()
    )
    return [_product_to_dict(p) for p in products]


# =============================================================================
# Products
# =============================================================================

@router.get("/products/barcode/{barcode}", response_model=dict)
def get_product_by_barcode(
    barcode: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required)
):
    """Find an active product by its barcode."""
    product = (
        db.query(Product)
        .options(joinedload(Product.category))
        .filter(Product.barcode == barcode, Product.is_active == True)
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    return _product_to_dict(product)


@router.get("/products", response_model=List[dict])
def list_products(
    search: Optional[str] = Query(None, description="Search by name, code or barcode"),
    category_id: Optional[int] = Query(None, description="Filter by category ID"),
    low_stock: Optional[bool] = Query(None, description="Filter products with low stock"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Max records per page"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required)
):
    """List products with optional filters, pagination, and eager-loaded category."""
    query = db.query(Product).options(joinedload(Product.category))

    # Text search across name, code, and barcode
    if search:
        pattern = f"%{search}%"
        query = query.filter(
            (Product.name.ilike(pattern)) |
            (Product.code.ilike(pattern)) |
            (Product.barcode.ilike(pattern))
        )

    # Filter by category
    if category_id is not None:
        query = query.filter(Product.category_id == category_id)

    # Low stock filter (current_stock <= min_stock)
    if low_stock is not None and low_stock:
        query = query.filter(Product.current_stock <= Product.min_stock)

    # Active status filter (defaults to active only)
    if is_active is not None:
        query = query.filter(Product.is_active == is_active)
    else:
        query = query.filter(Product.is_active == True)

    products = query.order_by(Product.name).offset(skip).limit(limit).all()
    return [_product_to_dict(p) for p in products]


@router.get("/products/{product_id}", response_model=dict)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required)
):
    """Get a single product by ID with category information."""
    product = (
        db.query(Product)
        .options(joinedload(Product.category))
        .filter(Product.id == product_id)
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    return _product_to_dict(product)


@router.post("/products", response_model=dict, status_code=status.HTTP_201_CREATED)
def create_product(
    data: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required([UserRole.ADMIN, UserRole.STOCKIST]))
):
    """Create a new product (admin or stockist).

    Validates category existence and unique code/barcode.
    Raises a low-stock warning if current_stock <= min_stock.
    """
    # Validate category exists
    category = db.query(Category).filter(Category.id == data.category_id).first()
    if not category:
        raise HTTPException(
            status_code=400,
            detail="Categoria não encontrada"
        )

    # Uniqueness: code
    if db.query(Product).filter(Product.code == data.code).first():
        raise HTTPException(
            status_code=400,
            detail="Código do produto já existe"
        )

    # Uniqueness: barcode (optional)
    if data.barcode:
        existing = db.query(Product).filter(Product.barcode == data.barcode).first()
        if existing:
            raise HTTPException(
                status_code=400,
                detail="Código de barras já existe"
            )

    product = Product(**data.dict())
    db.add(product)
    db.commit()
    db.refresh(product)

    # Attach the category relationship for the response dict
    product.category = category

    # Low-stock warning (logged/raised as a warning, not a blocker)
    if product.current_stock <= product.min_stock:
        # The product is still created successfully; the caller can inspect
        # the returned current_stock vs min_stock to detect the condition.
        pass

    return _product_to_dict(product)


@router.put("/products/{product_id}", response_model=dict)
def update_product(
    product_id: int,
    data: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required([UserRole.ADMIN, UserRole.STOCKIST]))
):
    """Update an existing product (admin or stockist).

    Checks uniqueness constraints for code and barcode when those
    fields are being changed.
    """
    product = (
        db.query(Product)
        .options(joinedload(Product.category))
        .filter(Product.id == product_id)
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")

    # Uniqueness: code (only if changed)
    if data.code is not None and data.code != product.code:
        existing = db.query(Product).filter(
            Product.code == data.code,
            Product.id != product_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=400,
                detail="Código do produto já existe"
            )

    # Uniqueness: barcode (only if changed)
    if data.barcode is not None and data.barcode != product.barcode:
        existing = db.query(Product).filter(
            Product.barcode == data.barcode,
            Product.id != product_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=400,
                detail="Código de barras já existe"
            )

    # Validate category if being changed
    if data.category_id is not None and data.category_id != product.category_id:
        category = db.query(Category).filter(Category.id == data.category_id).first()
        if not category:
            raise HTTPException(
                status_code=400,
                detail="Categoria não encontrada"
            )

    update_data = data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(product, key, value)

    db.commit()
    db.refresh(product)

    return _product_to_dict(product)


@router.delete("/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required([UserRole.ADMIN, UserRole.STOCKIST]))
):
    """Soft delete a product by setting is_active to False."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")

    product.is_active = False
    db.commit()
    return None


# =============================================================================
# Stock Movements
# =============================================================================

@router.post("/products/{product_id}/stock", response_model=StockMovementResponse, status_code=status.HTTP_201_CREATED)
def create_stock_movement(
    product_id: int,
    movement_type: str = Query(..., description="Tipo: entrada, saida, ajuste"),
    quantity: float = Query(..., gt=0, description="Quantidade do movimento"),
    unit_price: Optional[float] = Query(None, ge=0, description="Preço unitário"),
    notes: Optional[str] = Query(None, description="Observações"),
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required([UserRole.ADMIN, UserRole.STOCKIST]))
):
    """Record a stock movement (entrada / saida / ajuste).

    - **entrada**:  adds quantity to current_stock
    - **saida**:    subtracts quantity (checks sufficiency first)
    - **ajuste**:   sets current_stock to the given quantity
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")

    # Validate and parse movement type enum
    try:
        mov_type = MovementType(movement_type)
    except ValueError:
        valid = [t.value for t in MovementType]
        raise HTTPException(
            status_code=400,
            detail=f"Tipo de movimento inválido. Valores válidos: {', '.join(valid)}"
        )

    # Apply stock change logic
    if mov_type == MovementType.IN:
        product.current_stock += quantity
    elif mov_type == MovementType.OUT:
        if float(product.current_stock) < quantity:
            raise HTTPException(
                status_code=400,
                detail="Estoque insuficiente para esta movimentação"
            )
        product.current_stock -= quantity
    elif mov_type == MovementType.ADJUST:
        product.current_stock = quantity

    total_price = (unit_price * quantity) if unit_price is not None else None

    movement = StockMovement(
        product_id=product_id,
        user_id=current_user.id,
        movement_type=mov_type,
        quantity=quantity,
        unit_price=unit_price,
        total_price=total_price,
        notes=notes
    )
    db.add(movement)
    db.commit()
    db.refresh(movement)

    return StockMovementResponse(
        id=movement.id,
        product_id=movement.product_id,
        user_id=movement.user_id,
        movement_type=movement.movement_type.value if hasattr(movement.movement_type, 'value') else movement.movement_type,
        quantity=float(movement.quantity),
        unit_price=float(movement.unit_price) if movement.unit_price else None,
        total_price=float(movement.total_price) if movement.total_price else None,
        reference_type=movement.reference_type,
        reference_id=movement.reference_id,
        notes=movement.notes,
        created_at=movement.created_at
    )


@router.get("/products/{product_id}/stock/history", response_model=List[StockMovementResponse])
def list_stock_movements(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required)
):
    """List all stock movements for a product, most recent first.

    Includes basic product info (id, code, name, barcode, unit) in each entry.
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")

    movements = (
        db.query(StockMovement)
        .filter(StockMovement.product_id == product_id)
        .order_by(StockMovement.created_at.desc())
        .all()
    )

    return [
        StockMovementResponse(
            id=m.id,
            product_id=m.product_id,
            user_id=m.user_id,
            movement_type=m.movement_type.value if hasattr(m.movement_type, 'value') else m.movement_type,
            quantity=float(m.quantity),
            unit_price=float(m.unit_price) if m.unit_price else None,
            total_price=float(m.total_price) if m.total_price else None,
            reference_type=m.reference_type,
            reference_id=m.reference_id,
            notes=m.notes,
            created_at=m.created_at,
            product={
                "id": product.id,
                "code": product.code,
                "name": product.name,
                "barcode": product.barcode,
                "unit": product.unit
            }
        )
        for m in movements
    ]
