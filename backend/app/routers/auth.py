from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.user import User, UserRole
from app.schemas.auth import LoginRequest, TokenResponse, UserCreate, UserUpdate, UserResponse
from app.utils.auth import verify_password, get_password_hash, create_access_token, get_current_user, get_current_user_required, role_required

router = APIRouter(prefix="/api/auth", tags=["Autenticação"])

@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == request.username).first()
    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Usuário ou senha inválidos")
    if not user.is_active:
        raise HTTPException(status_code=401, detail="Usuário inativo")
    access_token = create_access_token(data={"sub": user.id})
    return TokenResponse(
        access_token=access_token,
        user=UserResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            full_name=user.full_name,
            role=user.role.value if hasattr(user.role, 'value') else user.role,
            is_active=user.is_active,
            phone=user.phone,
            created_at=user.created_at
        )
    )

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user_required)):
    return UserResponse(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role.value if hasattr(current_user.role, 'value') else current_user.role,
        is_active=current_user.is_active,
        phone=current_user.phone,
        created_at=current_user.created_at
    )

@router.get("/users", response_model=List[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required([UserRole.ADMIN]))
):
    users = db.query(User).all()
    return [UserResponse(
        id=u.id, username=u.username, email=u.email,
        full_name=u.full_name,
        role=u.role.value if hasattr(u.role, 'value') else u.role,
        is_active=u.is_active, phone=u.phone, created_at=u.created_at
    ) for u in users]

@router.post("/users", response_model=UserResponse)
def create_user(
    data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required([UserRole.ADMIN]))
):
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(status_code=400, detail="Usuário já existe")
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    user = User(
        username=data.username,
        email=data.email,
        full_name=data.full_name,
        hashed_password=get_password_hash(data.password),
        role=UserRole(data.role) if hasattr(UserRole, data.role) else UserRole.VIEWER,
        phone=data.phone
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserResponse(
        id=user.id, username=user.username, email=user.email,
        full_name=user.full_name,
        role=user.role.value if hasattr(user.role, 'value') else user.role,
        is_active=user.is_active, phone=user.phone, created_at=user.created_at
    )

@router.put("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required([UserRole.ADMIN]))
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    if data.email is not None:
        user.email = data.email
    if data.full_name is not None:
        user.full_name = data.full_name
    if data.role is not None:
        user.role = UserRole(data.role)
    if data.is_active is not None:
        user.is_active = data.is_active
    if data.phone is not None:
        user.phone = data.phone
    db.commit()
    db.refresh(user)
    return UserResponse(
        id=user.id, username=user.username, email=user.email,
        full_name=user.full_name,
        role=user.role.value if hasattr(user.role, 'value') else user.role,
        is_active=user.is_active, phone=user.phone, created_at=user.created_at
    )

@router.delete("/users/{user_id}", status_code=204)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required([UserRole.ADMIN]))
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Não é possível excluir o próprio usuário")
    db.delete(user)
    db.commit()
