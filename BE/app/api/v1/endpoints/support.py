from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.api.v1.deps import get_current_user, get_optional_current_user, require_admin
from app.core.rate_limiter import check_rate_limit
from app.db.mongodb import get_db
from app.schemas.common import APIResponse
from app.schemas.support import SupportTicketCreate, SupportTicketOut, SupportTicketStatusUpdate
from app.schemas.user import UserResponse
from app.services.support_service import SupportService

router = APIRouter(prefix="/support", tags=["Support"], dependencies=[Depends(check_rate_limit)])


@router.post("/contact", response_model=APIResponse[SupportTicketOut], status_code=status.HTTP_201_CREATED)
async def submit_contact_form(
    req: SupportTicketCreate,
    current_user: Optional[UserResponse] = Depends(get_optional_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Public: submit the contact/support form. Works signed in or as a guest.

    Signed in, the name and email are taken from the account, not the form fields, so a ticket
    can't be raised under someone else's name or email while logged in as yourself."""
    if current_user:
        req = req.model_copy(update={"name": current_user.full_name, "email": current_user.email})
    ticket = await SupportService(db).submit_ticket(req, user_id=current_user.id if current_user else None)
    return APIResponse(
        success=True,
        message=f"Ticket {ticket.ticket_number} created — we'll get back to you by email.",
        data=ticket,
    )


@router.get("/my-tickets", response_model=APIResponse[List[SupportTicketOut]])
async def list_my_support_tickets(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """A signed-in user: only the tickets they themselves raised, newest first."""
    tickets = await SupportService(db).list_my_tickets(current_user.id, skip=skip, limit=limit)
    return APIResponse(success=True, message=f"{len(tickets)} tickets", data=tickets)


@router.get("/tickets", response_model=APIResponse[List[SupportTicketOut]])
async def list_support_tickets(
    status_filter: Optional[str] = Query(None, alias="status", pattern="^(OPEN|RESOLVED)$"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    admin: UserResponse = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Admin: contact-form tickets, newest first."""
    tickets = await SupportService(db).list_tickets(status=status_filter, skip=skip, limit=limit)
    return APIResponse(success=True, message=f"{len(tickets)} tickets", data=tickets)


@router.put("/tickets/{ticket_id}/status", response_model=APIResponse[SupportTicketOut])
async def update_support_ticket_status(
    ticket_id: str,
    req: SupportTicketStatusUpdate,
    admin: UserResponse = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Admin: mark a ticket resolved or reopen it."""
    ticket = await SupportService(db).set_status(ticket_id, req.status, note=req.note)
    return APIResponse(success=True, message=f"Ticket {ticket.ticket_number} marked {req.status}", data=ticket)
