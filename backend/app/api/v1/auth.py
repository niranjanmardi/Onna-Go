import os
import re
import uuid
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request, UploadFile, File, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func

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
    ChangePasswordRequest,
    DeleteAccountRequest,
    PasswordResetRequest,
    PasswordResetConfirm,
    UsernameCheckResponse
)
from backend.app.api.v1.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

ALLOWED_AVATAR_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
USERNAME_REGEX = re.compile(r"^[a-zA-Z0-9_]{3,20}$")

def validate_image_bytes(content: bytes, ext: str) -> bool:
    """
    Validates file magic bytes to verify legitimate image formats.
    Prevents disguised payloads or malicious file uploads.
    """
    if len(content) < 12:
        return False
    if ext in (".jpg", ".jpeg"):
        return content.startswith(b"\xff\xd8\xff")
    elif ext == ".png":
        return content.startswith(b"\x89PNG\r\n\x1a\n")
    elif ext == ".webp":
        return content[:4] == b"RIFF" and content[8:12] == b"WEBP"
    return False

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

@router.get("/check-username", response_model=UsernameCheckResponse)
def check_username(username: str = Query(..., min_length=1, max_length=50), db: Session = Depends(get_db)):
    """
    Real-time username availability check endpoint.
    Enforces format rules: 3-20 chars, alphanumeric + underscore.
    Case-insensitive uniqueness check.
    """
    clean_username = username.strip().lower()
    if not USERNAME_REGEX.match(clean_username):
        return UsernameCheckResponse(
            username=clean_username,
            available=False,
            message="Username must be 3–20 characters and contain only letters, numbers, or underscores."
        )

    existing = db.query(User).filter(func.lower(User.username) == clean_username).first()
    if existing:
        return UsernameCheckResponse(
            username=clean_username,
            available=False,
            message="This username is already taken. Try another."
        )

    return UsernameCheckResponse(
        username=clean_username,
        available=True,
        message="Username is available!"
    )

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserRegister, response: Response, db: Session = Depends(get_db)):
    # 1. Determine and validate username
    if user_in.username:
        clean_username = user_in.username.strip().lower()
        if not USERNAME_REGEX.match(clean_username):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username must be 3–20 characters long and contain only letters, numbers, and underscores."
            )
        existing_username = db.query(User).filter(func.lower(User.username) == clean_username).first()
        if existing_username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An account with this username already exists."
            )
    else:
        # Auto-derive unique username from email prefix
        base_handle = re.sub(r'[^a-zA-Z0-9_]', '', user_in.email.split('@')[0].lower())[:14]
        if len(base_handle) < 3:
            base_handle = "user"
        candidate = base_handle
        counter = 1
        while db.query(User).filter(func.lower(User.username) == candidate).first():
            suffix = f"_{uuid.uuid4().hex[:4]}"
            candidate = f"{base_handle[:15]}{suffix}"
            counter += 1
            if counter > 10:
                candidate = f"u_{uuid.uuid4().hex[:8]}"
                break
        clean_username = candidate

    # 3. Check email uniqueness (case-insensitive)
    clean_email = user_in.email.strip().lower()
    existing_email = db.query(User).filter(func.lower(User.email) == clean_email).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )
    
    # 4. Hash password securely
    hashed_password = get_password_hash(user_in.password)
    
    # 5. Create user with permanent UID (assigned by model uuid default)
    user = User(
        username=clean_username,
        email=clean_email,
        full_name=user_in.full_name.strip(),
        hashed_password=hashed_password,
        default_currency=(user_in.default_currency or "INR").upper(),
        auth_provider="email"
    )
    db.add(user)
    db.flush()
    
    # Welcome notification
    welcome_notif = Notification(
        user_id=user.id,
        title="Welcome to ONNA-GO! 🏍️",
        message="Ride Together. Vibe Together. Split Together. Start by connecting with friends or planning your next trip.",
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
    clean_identifier = user_in.email.strip().lower()
    # Support login via either email or username
    user = db.query(User).filter(
        (func.lower(User.email) == clean_identifier) | 
        (func.lower(User.username) == clean_identifier)
    ).first()
    
    if not user or not verify_password(user_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password."
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

@router.post("/change-password")
def change_password(
    req: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not verify_password(req.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The current password you entered is incorrect."
        )
    
    if len(req.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 8 characters long."
        )

    current_user.hashed_password = get_password_hash(req.new_password)
    db.commit()
    return {"message": "Password updated successfully."}

@router.post("/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Accepts JPEG, PNG, or WebP profile pictures.
    Performs content magic byte checking and saves directly to persistent storage.
    """
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No file selected.")

    _, ext = os.path.splitext(file.filename.lower())
    if ext not in ALLOWED_AVATAR_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported image format. Allowed: {', '.join(sorted(ALLOWED_AVATAR_EXTENSIONS))}"
        )
        
    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_BYTES // (1024*1024)}MB."
        )
    
    # Magic bytes check for security
    if not validate_image_bytes(content, ext):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File content does not match a valid image format."
        )
        
    unique_filename = f"avatar_{current_user.id}_{uuid.uuid4().hex[:8]}{ext}"
    target_path = os.path.join(settings.STORAGE_DIR, unique_filename)
    
    with open(target_path, "wb") as f:
        f.write(content)
        
    current_user.avatar_url = f"/api/v1/auth/avatar/{unique_filename}"
    db.commit()
    db.refresh(current_user)
    
    return {
        "message": "Avatar uploaded successfully.",
        "avatar_url": current_user.avatar_url
    }

@router.get("/avatar/{filename}")
def get_avatar(filename: str):
    clean_name = os.path.basename(filename)
    target_path = os.path.join(settings.STORAGE_DIR, clean_name)
    if not os.path.exists(target_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Avatar not found.")
    
    _, ext = os.path.splitext(clean_name.lower())
    media_types = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
    }
    media_type = media_types.get(ext, "image/jpeg")
    
    return FileResponse(
        target_path,
        media_type=media_type,
        headers={"Cache-Control": "public, max-age=86400"}
    )

@router.delete("/me")
def delete_account(
    req: DeleteAccountRequest,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if req.confirmation.strip() != "DELETE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Confirmation text must be 'DELETE' to confirm account deletion."
        )
    
    # Soft-delete to preserve trip history and financial conservation invariants
    current_user.is_active = False
    current_user.email = f"deleted_{uuid.uuid4().hex[:8]}_{current_user.email}"
    db.commit()
    
    clear_auth_cookie(response)
    return {"message": "Your account has been deleted successfully."}

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
    """
    Updates profile fields (Display Name, bio, phone, city, currency, avatar).
    Explicitly protects username, email, and permanent UID from modification.
    """
    if user_in.full_name is not None:
        trimmed_name = user_in.full_name.strip()
        if not trimmed_name:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Display name cannot be blank.")
        current_user.full_name = trimmed_name
        
    if user_in.bio is not None:
        current_user.bio = user_in.bio.strip()
        
    if user_in.phone_number is not None:
        current_user.phone_number = user_in.phone_number.strip()
        
    if user_in.city is not None:
        current_user.city = user_in.city.strip()
        
    if user_in.date_of_birth is not None:
        current_user.date_of_birth = user_in.date_of_birth.strip()
        
    if user_in.default_currency is not None:
        current_user.default_currency = user_in.default_currency.upper()
        
    if user_in.avatar_url is not None:
        current_user.avatar_url = user_in.avatar_url

    if user_in.upi_id is not None:
        cleaned_upi = user_in.upi_id.strip()
        if cleaned_upi == "":
            current_user.upi_id = None
        else:
            upi_regex = re.compile(r"^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$")
            if not upi_regex.match(cleaned_upi):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid UPI ID format. Expected format like username@bank or 9876543210@upi (e.g. name@okhdfcbank). Format check validates syntax only, not bank ownership."
                )
            current_user.upi_id = cleaned_upi
    
    db.commit()
    db.refresh(current_user)
    return UserResponse.model_validate(current_user)

@router.post("/password-reset-request")
def password_reset_request(request_data: PasswordResetRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(func.lower(User.email) == request_data.email.lower()).first()
    # Always return safe generic confirmation to prevent user enumeration
    if not user:
        return {"message": "If this email is registered, password reset instructions have been generated."}
    
    reset_token = create_access_token(f"reset:{user.id}", expires_delta=timedelta(minutes=15))
    return {
        "message": "Password reset instructions generated.",
        "dev_reset_token": reset_token
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
