from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class NotificationOut(BaseModel):
    id: str
    audience: str  # "ADMIN" (any admin) | "USER" (one specific person, user_id)
    user_id: Optional[str] = None
    type: str  # "TICKET_RAISED" | "TICKET_RESOLVED"
    title: str
    message: str
    ticket_id: Optional[str] = None
    is_read: bool = False
    created_at: datetime
