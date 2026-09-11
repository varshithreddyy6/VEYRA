"""FastAPI dependencies: current user, role guard, DB session, rate limiting."""
from __future__ import annotations

from typing import Annotated, Generator

import jwt as pyjwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import ACCESS_TOKEN_TYPE, decode_token
from app.db.models import User
from app.db.session import SessionLocal
from app.services.rate_limit import check_rate_limit

bearer_scheme = HTTPBearer(auto_error=False)


# ── Database session ───────────────────────────────────────────────────────
def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


DbSession = Annotated[Session, Depends(get_db)]


# ── Authentication ─────────────────────────────────────────────────────────
def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    db: DbSession,
) -> User:
    if credentials is None or not credentials.credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    try:
        payload = decode_token(credentials.credentials, ACCESS_TOKEN_TYPE)
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired") from None
    except pyjwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from None

    user = db.get(User, payload["sub"])
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User inactive or missing")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_admin(user: CurrentUser) -> User:
    if user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required")
    return user


AdminUser = Annotated[User, Depends(require_admin)]


# ── Rate limiting (Redis-backed with in-process fallback) ──────────────────
def rate_limit(limit: int, window_seconds: int = 60, name: str = "endpoint"):
    def dependency(request: Request) -> None:
        client = request.client.host if request.client else "unknown"
        if not check_rate_limit(f"{name}:{client}", limit, window_seconds):
            raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Rate limit exceeded")

    return dependency


def screen_rate_limit(request: Request) -> None:
    client = request.client.host if request.client else "unknown"
    if not check_rate_limit(f"screen:{client}", settings.rate_limit_screen_per_minute, 60):
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Rate limit exceeded")


def login_rate_limit(request: Request) -> None:
    client = request.client.host if request.client else "unknown"
    if not check_rate_limit(f"login:{client}", settings.rate_limit_login_per_minute, 60):
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Rate limit exceeded")
