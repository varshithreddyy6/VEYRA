"""Single-transaction screening endpoint."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, status

from app.core.dependencies import CurrentUser, DbSession, screen_rate_limit
from app.schemas.batch import BatchCreateResponse
from app.schemas.fraud import ScreenRequest, ScreenResponse
from app.services.scoring import screen_transaction
from app.services.audit import client_ip

router = APIRouter()


@router.post(
    "/screen/batch",
    response_model=BatchCreateResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Upload a batch CSV for async scoring (alias of POST /api/v1/batch)",
    dependencies=[Depends(screen_rate_limit)],
)
async def screen_batch_alias(
    file: UploadFile, request: Request, user: CurrentUser, db: DbSession
) -> BatchCreateResponse:
    """Spec-compliant alias: ``POST /api/v1/screen/batch`` == ``POST /api/v1/batch``.

    Delegates to the same validated upload + enqueue path so there is exactly
    one implementation of batch parsing.
    """
    from app.api.routes.batch import create_batch  # noqa: PLC0415  (avoid circular import)

    return await create_batch(file, request, user, db)


@router.post(
    "/screen",
    response_model=ScreenResponse,
    summary="Screen one transaction (model + rules + SHAP)",
    dependencies=[Depends(screen_rate_limit)],
)
def screen(payload: ScreenRequest, request: Request, user: CurrentUser, db: DbSession) -> ScreenResponse:
    try:
        result = screen_transaction(
            db,
            user,
            amount=payload.amount,
            occurred_at=payload.occurred_at,
            features=payload.features,
            external_ref=payload.external_ref,
            true_label=payload.true_label,
            ip_address=client_ip(request),
        )
    except RuntimeError as exc:
        # No trained model — honest 503 with a hint, never a fake score.
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    return ScreenResponse(**result)
