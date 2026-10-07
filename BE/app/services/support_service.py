import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.exceptions import NotFoundException
from app.repositories.support_repo import SupportTicketRepository
from app.schemas.support import SupportTicketCreate, SupportTicketOut
from app.services.notification_service import NotificationService


class SupportService:
    """Contact-form submissions, stored as tickets. No email is sent (no SMTP/API key is
    configured in this project yet) — admins are notified in-app instead (see
    NotificationService), and see the open-ticket count on GET /admin/stats too. Plugging in
    real email later just means adding a send call alongside the notify_* calls below."""

    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.repo = SupportTicketRepository(db)
        self.notifications = NotificationService(db)

    def _to_out(self, doc: Dict[str, Any]) -> SupportTicketOut:
        return SupportTicketOut(
            id=doc["_id"],
            ticket_number=doc["ticket_number"],
            name=doc["name"],
            email=doc["email"],
            subject=doc.get("subject"),
            message=doc["message"],
            status=doc.get("status", "OPEN"),
            user_id=doc.get("user_id"),
            created_at=doc["created_at"],
            resolved_at=doc.get("resolved_at"),
            resolution_note=doc.get("resolution_note"),
        )

    async def submit_ticket(self, req: SupportTicketCreate, user_id: Optional[str] = None) -> SupportTicketOut:
        ticket_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        doc = {
            "_id": ticket_id,
            "ticket_number": f"TKT-{str(uuid.uuid4().int)[:5]}",
            "name": req.name.strip(),
            "email": req.email,
            "subject": (req.subject or "").strip() or None,
            "message": req.message.strip(),
            "status": "OPEN",
            "user_id": user_id,
            "created_at": now,
            "resolved_at": None,
            "resolution_note": None,
        }
        await self.repo.insert(doc)
        await self.notifications.notify_admins(
            "TICKET_RAISED",
            title=f"New support ticket {doc['ticket_number']}",
            message=f"{doc['name']} ({doc['email']}) raised: {doc['subject'] or doc['message'][:80]}",
            ticket_id=ticket_id,
        )
        return self._to_out(doc)

    async def list_tickets(self, status: Optional[str], skip: int, limit: int) -> List[SupportTicketOut]:
        """Admin: every ticket, from everyone."""
        docs = await self.repo.list_tickets(status=status, skip=skip, limit=limit)
        return [self._to_out(d) for d in docs]

    async def list_my_tickets(self, user_id: str, skip: int = 0, limit: int = 50) -> List[SupportTicketOut]:
        """A signed-in user: only the tickets they themselves raised."""
        docs = await self.repo.list_for_user(user_id, skip=skip, limit=limit)
        return [self._to_out(d) for d in docs]

    async def set_status(self, ticket_id: str, status: str, note: Optional[str] = None) -> SupportTicketOut:
        doc = await self.repo.get_by_id(ticket_id)
        if not doc:
            raise NotFoundException(f"Ticket '{ticket_id}' not found")
        changes: Dict[str, Any] = {"status": status}
        changes["resolved_at"] = datetime.now(timezone.utc) if status == "RESOLVED" else None
        changes["resolution_note"] = note.strip() if (status == "RESOLVED" and note) else None
        updated = await self.repo.update(ticket_id, changes)

        if status == "RESOLVED" and doc.get("user_id"):
            note_text = f" {changes['resolution_note']}" if changes["resolution_note"] else ""
            await self.notifications.notify_user(
                doc["user_id"],
                "TICKET_RESOLVED",
                title=f"Ticket {doc['ticket_number']} resolved",
                message=f"Your ticket \"{doc.get('subject') or doc['message'][:60]}\" has been resolved.{note_text}",
                ticket_id=ticket_id,
            )
        return self._to_out(updated)

    async def count_open(self) -> int:
        return await self.repo.count_open()
