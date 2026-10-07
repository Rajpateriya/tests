from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class SupportTicketCreate(BaseModel):
    """A visitor or student's contact-form submission."""
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    subject: Optional[str] = Field(default=None, max_length=150)
    message: str = Field(min_length=5, max_length=4000)


class SupportTicketOut(BaseModel):
    id: str
    ticket_number: str
    name: str
    email: str
    subject: Optional[str] = None
    message: str
    status: str  # OPEN | RESOLVED
    user_id: Optional[str] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None
    resolution_note: Optional[str] = None


class SupportTicketStatusUpdate(BaseModel):
    status: str = Field(pattern="^(OPEN|RESOLVED)$")
    # Shown to the user in their "resolved" notification. Only meaningful when status is RESOLVED.
    note: Optional[str] = Field(default=None, max_length=1000)
