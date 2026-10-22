import time
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.app.core.config import settings
from backend.app.core.database import Base, engine
from backend.app.api.v1.auth import router as auth_router
from backend.app.api.v1.trips import router as trips_router
from backend.app.api.v1.activities import router as activities_router
from backend.app.api.v1.expenses import router as expenses_router
from backend.app.api.v1.balances import router as balances_router
from backend.app.api.v1.settlements import router as settlements_router
from backend.app.api.v1.budgets import router as budgets_router
from backend.app.api.v1.reports import router as reports_router
from backend.app.api.v1.notifications import router as notifications_router
from backend.app.api.v1.receipts import router as receipts_router
from backend.app.api.v1.dashboard import router as dashboard_router

# Ensure tables exist
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="ONNA-GO (ஒண்ணா போ) — Ride Together. Vibe Together. Split Together. Group trip & expense management API.",
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Request timing & security headers middleware
@app.middleware("http")
async def add_security_and_timing_headers(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = f"{process_time:.4f}s"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response

# Health check
@app.get("/health", tags=["Health"])
@app.get(f"{settings.API_V1_STR}/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "app": settings.PROJECT_NAME,
        "tamil_name": settings.TAMIL_NAME,
        "tagline": settings.TAGLINE,
        "version": settings.VERSION,
        "environment": "production" if settings.SECURE_COOKIE else "development"
    }

# Include API v1 Routers
api_v1_prefix = settings.API_V1_STR
app.include_router(auth_router, prefix=api_v1_prefix)
app.include_router(trips_router, prefix=api_v1_prefix)
app.include_router(activities_router, prefix=api_v1_prefix)
app.include_router(expenses_router, prefix=api_v1_prefix)
app.include_router(balances_router, prefix=api_v1_prefix)
app.include_router(settlements_router, prefix=api_v1_prefix)
app.include_router(budgets_router, prefix=api_v1_prefix)
app.include_router(reports_router, prefix=api_v1_prefix)
app.include_router(notifications_router, prefix=api_v1_prefix)
app.include_router(receipts_router, prefix=api_v1_prefix)
app.include_router(dashboard_router, prefix=api_v1_prefix)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
