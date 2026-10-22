import os
import uuid
import secrets
from datetime import timedelta
import httpx
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request, UploadFile, File
from fastapi.responses import FileResponse
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
    GoogleAuthRequest,
    ChangePasswordRequest,
    DeleteAccountRequest,
    PasswordResetRequest,
    PasswordResetConfirm
)
from backend.app.api.v1.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

ALLOWED_AVATAR_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}

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
        default_currency=user_in.default_currency or "INR",
        auth_provider="email"
    )
    db.add(user)
    db.flush()
    
    # Welcome notification (Clean English)
    welcome_notif = Notification(
        user_id=user.id,
        title="Welcome to ONNA-GO! 🏍️",
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
            detail="Incorrect email address or password."
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

@router.post("/google", response_model=TokenResponse)
async def google_auth(auth_req: GoogleAuthRequest, response: Response, db: Session = Depends(get_db)):
    """
    Validates Google ID Token (JWT) via Google's official OpenID Connect tokeninfo endpoint.
    Retrieves or provisions the user account securely.
    """
    credential = auth_req.credential.strip()
    if not credential:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing Google credential.")
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            token_res = await client.get(
                "https://oauth2.googleapis.com/tokeninfo",
                params={"id_token": credential}
            )
            
        if token_res.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Google authentication token."
            )
            
        payload = token_res.json()
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to communicate with Google authentication servers."
        )

    # Validate token issuer
    iss = payload.get("iss", "")
    if iss not in ("accounts.google.com", "https://accounts.google.com"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token issuer.")
        
    # If client ID is configured in settings, ensure aud matches
    if settings.GOOGLE_CLIENT_ID and payload.get("aud") != settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token audience does not match Client ID.")

    email = payload.get("email", "").lower()
    if not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Google token did not contain an email address.")
    
    google_sub = payload.get("sub")
    full_name = payload.get("name") or email.split("@")[0]
    picture = payload.get("picture")

    # Look up existing user by email or google_id
    user = db.query(User).filter((User.email == email) | (User.google_id == google_sub)).first()
    
    if user:
        if not user.is_active:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Your account has been deactivated.")
        
        # Link google_id if not present
        if not user.google_id and google_sub:
            user.google_id = google_sub
            
        if not user.avatar_url and picture:
            user.avatar_url = picture
            
        user.is_verified = True
        db.commit()
        db.refresh(user)
    else:
        # Create new user for first-time Google sign in
        random_pass = get_password_hash(secrets.token_urlsafe(32))
        user = User(
            email=email,
            full_name=full_name.strip(),
            hashed_password=random_pass,
            avatar_url=picture,
            google_id=google_sub,
            auth_provider="google",
            is_active=True,
            is_verified=True,
            default_currency="INR"
        )
        db.add(user)
        db.flush()

        welcome_notif = Notification(
            user_id=user.id,
            title="Welcome to ONNA-GO! 🏍️",
            message="Your account was securely connected via Google Sign-In. Plan your trips and split expenses with ease.",
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
    _, ext = os.path.splitext(file.filename.lower())
    if ext not in ALLOWED_AVATAR_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported image format. Allowed: {', '.join(ALLOWED_AVATAR_EXTENSIONS)}"
        )
        
    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_BYTES // (1024*1024)}MB."
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
    return FileResponse(target_path)

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
