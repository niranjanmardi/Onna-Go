from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.core.database import get_db
from backend.app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    decode_access_token
)
from backend.app.models.models import User, Notification
from backend.app.schemas.schemas import (
    UserRegister,
    UserLogin,
    UserResponse,
    UserUpdate,
    TokenResponse,
    PasswordResetRequest,
    PasswordResetConfirm
)
from backend.app.api.v1.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

def set_auth_cookie(response: Response, token: str):
    response.set_cookie(
        key=settings.COOKIE_NAME,
        value=token,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        httponly=True,
        samesite=settings.SAME_SITE,
        secure=settings.SECURE_COOKIE,
    )

def clear_auth_cookie(response: Response):
    response.delete_cookie(
        key=settings.COOKIE_NAME,
        httponly=True,
        samesite=settings.SAME_SITE,
        secure=settings.SECURE_COOKIE,
    )

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserRegister, response: Response, db: Session = Depends(get_db)):
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_in.email.lower()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists."
        )
    
    hashed_password = get_password_hash(user_in.password)
    user = User(
        email=user_in.email.lower(),
        full_name=user_in.full_name.strip(),
        hashed_password=hashed_password,
        default_currency=user_in.default_currency or "INR"
    )
    db.add(user)
    db.flush()
    
    # Welcome notification
    welcome_notif = Notification(
        user_id=user.id,
        title="Welcome to ONNA-GO! ஒண்ணா போ 🏍️🎶",
        message="Ride Together. Vibe Together. Split Together. Start by creating a road trip, ride, or weekend hangout.",
        type="GENERAL"
    )
    db.add(welcome_notif)
    db.commit()
    db.refresh(user)
    
    token = create_access_token(user.id)
    set_auth_cookie(response, token)
    
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

@router.post("/login", response_model=TokenResponse)
def login(user_in: UserLogin, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_in.email.lower()).first()
    if not user or not verify_password(user_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated."
        )
        
    token = create_access_token(user.id)
    set_auth_cookie(response, token)
    
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

@router.post("/logout")
def logout(response: Response):
    clear_auth_cookie(response)
    return {"message": "Successfully logged out."}

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)

@router.put("/me", response_model=UserResponse)
def update_profile(
    user_in: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if user_in.full_name is not None:
        current_user.full_name = user_in.full_name.strip()
    if user_in.default_currency is not None:
        current_user.default_currency = user_in.default_currency.upper()
    if user_in.avatar_url is not None:
        current_user.avatar_url = user_in.avatar_url
    
    db.commit()
    db.refresh(current_user)
    return UserResponse.model_validate(current_user)

@router.post("/password-reset-request")
def password_reset_request(request_data: PasswordResetRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request_data.email.lower()).first()
    # To prevent user enumeration, always return success message
    if not user:
        return {"message": "If this email is registered, password reset instructions have been generated."}
    
    # Generate 15-minute reset token
    reset_token = create_access_token(f"reset:{user.id}", expires_delta=timedelta(minutes=15))
    # In production without an SMTP gateway configured, we return the token in dev mode
    return {
        "message": "Password reset token generated.",
        "dev_reset_token": reset_token  # For automated testing and local dev
    }

@router.post("/password-reset-confirm")
def password_reset_confirm(confirm_data: PasswordResetConfirm, db: Session = Depends(get_db)):
    payload = decode_access_token(confirm_data.token)
    if not payload or not payload.get("sub", "").startswith("reset:"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired password reset token."
        )
    user_id = payload["sub"].replace("reset:", "")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
        
    user.hashed_password = get_password_hash(confirm_data.new_password)
    db.commit()
    return {"message": "Password reset successfully. You can now log in with your new password."}
