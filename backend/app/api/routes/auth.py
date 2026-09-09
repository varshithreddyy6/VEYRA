"""Authentication routes: register, login, refresh, logout, me."""
from __future__ import annotations

import logging
from datetime import datetime, timezone

import jwt as pyjwt
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError, OperationalError

from app.core.dependencies import CurrentUser, DbSession, login_rate_limit
from app.core.security import (
    REFRESH_TOKEN_TYPE,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.db.models import User
from app.schemas.auth import (
    AuthResponse,
    LoginRequest,
    LogoutResponse,
    MessageResponse,
    RefreshRequest,
    RefreshResponse,
    RegisterRequest,
    TokenPair,
    UserOut,
)
from app.services.audit import audit, client_ip
from app.services.token_store import token_store

logger = logging.getLogger("app.auth")
router = APIRouter()


def _token_pair(user: User) -> TokenPair:
    access, expires = create_access_token(user.id, user.role)
    refresh, _ = create_refresh_token(user.id)
    ttl_minutes = (expires - datetime.now(timezone.utc)).total_seconds() / 60
    return TokenPair(
        access_token=access,
        refresh_token=refresh,
        expires_in=int(ttl_minutes * 60),
    )


def _raise_duplicate_email() -> None:
    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED,
             dependencies=[Depends(login_rate_limit)])
def register(payload: RegisterRequest, request: Request, db: DbSession) -> AuthResponse:
    if payload.role != "analyst":
        # Self-registration as admin is intentionally blocked; admins are
        # seeded (db/seed.py) or promoted by an existing admin.
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="Admin accounts are provisioned by the system, not via self-registration")

    existing = db.execute(select(User).where(User.email == payload.email)).scalar_one_or_none()
    if existing:
        _raise_duplicate_email()

    user = User(
        email=payload.email.lower(),
        full_name=payload.full_name.strip(),
        role="analyst",
        hashed_password=hash_password(payload.password),
        is_active=True,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        # Race: another request created the same email between the SELECT and commit.
        db.rollback()
        _raise_duplicate_email()
    except OperationalError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database unavailable. Verify DATABASE_URL and run: alembic upgrade head",
        ) from None
    db.refresh(user)

    audit(db, action="auth.register", entity_type="user", entity_id=user.id,
          metadata_json={"email": user.email}, ip_address=client_ip(request))
    logger.info("Registered user %s", user.email)
    return AuthResponse(user=UserOut.model_validate(user), tokens=_token_pair(user))


@router.post("/login", response_model=AuthResponse, dependencies=[Depends(login_rate_limit)])
def login(payload: LoginRequest, request: Request, db: DbSession) -> AuthResponse:
    try:
        user = db.execute(select(User).where(User.email == payload.email.lower())).scalar_one_or_none()
    except OperationalError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database unavailable. Verify DATABASE_URL and run: alembic upgrade head",
        ) from None
    # Constant-shape response for unknown email vs bad password (no user enumeration).
    if user is None or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled")

    audit(db, action="auth.login", entity_type="user", entity_id=user.id,
          ip_address=client_ip(request))
    return AuthResponse(user=UserOut.model_validate(user), tokens=_token_pair(user))


@router.post("/refresh", response_model=RefreshResponse)
def refresh(payload: RefreshRequest, request: Request, db: DbSession) -> RefreshResponse:
    try:
        claims = decode_token(payload.refresh_token, REFRESH_TOKEN_TYPE)
    except pyjwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token") from None

    jti = claims.get("jti", "")
    if token_store.is_revoked(jti):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token revoked")

    user = db.get(User, claims["sub"])
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User inactive or missing")

    access, expires = create_access_token(user.id, user.role)
    audit(db, action="auth.refresh", entity_type="user", entity_id=user.id,
          ip_address=client_ip(request), commit=False)
    db.commit()
    return RefreshResponse(
        access_token=access,
        expires_in=int(max((expires - datetime.now(timezone.utc)).total_seconds(), 0)),
    )


@router.post("/logout", response_model=LogoutResponse)
def logout(payload: RefreshRequest, request: Request, db: DbSession) -> LogoutResponse:
    """Revoke the presented refresh token (logout on this device)."""
    revoked = False
    try:
        claims = decode_token(payload.refresh_token, REFRESH_TOKEN_TYPE)
        token_store.revoke(claims.get("jti", ""), token_store.ttl_seconds())
        revoked = True
    except pyjwt.PyJWTError:
        pass
    audit(db, action="auth.logout", entity_type="session", ip_address=client_ip(request),
          metadata_json={"revoked": revoked})
    return LogoutResponse(message="Logged out", revoked=revoked)


@router.get("/me", response_model=UserOut)
def me(user: CurrentUser) -> UserOut:
    return UserOut.model_validate(user)


@router.get("/ping", response_model=MessageResponse)
def ping() -> MessageResponse:
    """Lightweight auth guard check for the frontend."""
    return MessageResponse(message="Authenticated")
