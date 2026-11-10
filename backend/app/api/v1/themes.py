from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.models.models import User, UserTheme
from backend.app.schemas.schemas import ThemeItemResponse, UserThemeResponse, UserThemeUpdate
from backend.app.api.v1.deps import get_current_user
from backend.app.core.theme_catalog import THEMES_CATALOG_DATA, VALID_THEME_IDS

router = APIRouter(prefix="/themes", tags=["Themes"])

@router.get("", response_model=List[ThemeItemResponse])
def get_themes_catalog():
    """
    Returns the official 50 distinct artistic wallpapers catalog with metadata,
    palettes, categories, and responsive asset references.
    """
    return [ThemeItemResponse(**theme) for theme in THEMES_CATALOG_DATA]

@router.get("/me", response_model=UserThemeResponse)
def get_my_theme(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieves the authenticated user's active theme and wallpaper customization settings.
    Returns the default configuration if the user has not selected a custom theme yet.
    """
    user_theme = db.query(UserTheme).filter(UserTheme.user_id == current_user.id).first()
    if not user_theme:
        return UserThemeResponse(
            theme_id="howrah_bridge",
            overlay_opacity=0.65,
            overlay_style="dark",
            blur_level=0,
            updated_at=None
        )
    effective_id = user_theme.theme_id if user_theme.theme_id != "default" else "howrah_bridge"
    return UserThemeResponse(
        theme_id=effective_id,
        overlay_opacity=user_theme.overlay_opacity if user_theme.overlay_opacity is not None else 0.65,
        overlay_style=user_theme.overlay_style or "dark",
        blur_level=user_theme.blur_level if user_theme.blur_level is not None else 0,
        updated_at=user_theme.updated_at
    )

@router.put("/me", response_model=UserThemeResponse)
def update_my_theme(
    theme_in: UserThemeUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Updates the authenticated user's theme selection.
    Strictly validates theme_id against the official 50-theme catalog.
    Persists across app restarts and devices.
    """
    requested_id = theme_in.theme_id.strip()
    if requested_id not in VALID_THEME_IDS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid theme ID '{requested_id}'. Must be one of the official 50 artistic themes or 'default'."
        )

    user_theme = db.query(UserTheme).filter(UserTheme.user_id == current_user.id).first()
    now = datetime.now(timezone.utc)

    if not user_theme:
        user_theme = UserTheme(
            user_id=current_user.id,
            theme_id=requested_id,
            overlay_opacity=theme_in.overlay_opacity if theme_in.overlay_opacity is not None else 0.75,
            overlay_style=theme_in.overlay_style or "dark",
            blur_level=theme_in.blur_level if theme_in.blur_level is not None else 0,
            created_at=now,
            updated_at=now
        )
        db.add(user_theme)
    else:
        user_theme.theme_id = requested_id
        if theme_in.overlay_opacity is not None:
            user_theme.overlay_opacity = theme_in.overlay_opacity
        if theme_in.overlay_style is not None:
            user_theme.overlay_style = theme_in.overlay_style
        if theme_in.blur_level is not None:
            user_theme.blur_level = theme_in.blur_level
        user_theme.updated_at = now

    db.commit()
    db.refresh(user_theme)

    return UserThemeResponse(
        theme_id=user_theme.theme_id,
        overlay_opacity=user_theme.overlay_opacity,
        overlay_style=user_theme.overlay_style,
        blur_level=user_theme.blur_level,
        updated_at=user_theme.updated_at
    )

@router.post("/reset", response_model=UserThemeResponse)
def reset_my_theme(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Resets the authenticated user's wallpaper and theme to Howrah Bridge — Golden Sunset.
    """
    user_theme = db.query(UserTheme).filter(UserTheme.user_id == current_user.id).first()
    now = datetime.now(timezone.utc)

    if user_theme:
        user_theme.theme_id = "howrah_bridge"
        user_theme.overlay_opacity = 0.65
        user_theme.overlay_style = "dark"
        user_theme.blur_level = 0
        user_theme.updated_at = now
        db.commit()
        db.refresh(user_theme)

    return UserThemeResponse(
        theme_id="howrah_bridge",
        overlay_opacity=0.65,
        overlay_style="dark",
        blur_level=0,
        updated_at=now
    )
