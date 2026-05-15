from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from jose import jwt
from passlib.context import CryptContext

from ..database import get_db
from ..models.models import User
from ..schemas.schemas import UserRegister, UserLogin, Token, UserOut, UserUpdate
from ..config import settings
from ..deps import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def create_token(user_id: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    return jwt.encode(
        {"sub": user_id, "exp": expire},
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


@router.post("/register", response_model=Token, status_code=201)
def register(data: UserRegister, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=data.email,
        password_hash=pwd_context.hash(data.password),
        name=data.name or data.email.split("@")[0],
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return Token(access_token=create_token(str(user.id)), user=UserOut.model_validate(user))


@router.post("/login", response_model=Token)
def login(data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not pwd_context.verify(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return Token(access_token=create_token(str(user.id)), user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserOut)
def update_profile(
    data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if data.name is not None:
        current_user.name = data.name
    if data.bio is not None:
        current_user.bio = data.bio
    db.commit()
    db.refresh(current_user)
    return current_user
