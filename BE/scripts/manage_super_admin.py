"""CLI script to manage and create Super Admins."""
import asyncio
import argparse
import os
import sys
import uuid
from datetime import datetime, timezone

# Ensure BE directory is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.config import settings
from app.core.security import hash_password
from app.db.mongodb import db_manager
from app.models.user import UserRole


async def list_admins():
    db = db_manager.get_database()
    cursor = db.users.find(
        {"role": {"$in": ["admin", "super_admin"]}},
        {"email": 1, "full_name": 1, "role": 1, "subdomain": 1, "organization_name": 1}
    )
    users = await cursor.to_list(length=100)
    print("\n--- Current Admins & Super Admins ---")
    if not users:
        print("No admin users found.")
    for u in users:
        print(f"ID: {u.get('_id')} | Email: {u.get('email')} | Role: {u.get('role')} | Subdomain: {u.get('subdomain')} | Org: {u.get('organization_name')}")
    print("------------------------------------\n")


async def create_or_promote_super_admin(email: str, password: str = None, full_name: str = "Super Admin"):
    db = db_manager.get_database()
    email_clean = email.lower().strip()
    user = await db.users.find_one({"email": email_clean})

    if user:
        update_fields = {
            "role": UserRole.SUPER_ADMIN.value,
            "is_active": True,
            "updated_at": datetime.now(timezone.utc),
        }
        if password:
            update_fields["hashed_password"] = hash_password(password)
        await db.users.update_one({"_id": user["_id"]}, {"$set": update_fields})
        print(f"Successfully promoted existing user '{email_clean}' to role: 'super_admin'!")
    else:
        if not password:
            print("Error: Password is required to create a new Super Admin.")
            return

        new_user = {
            "_id": str(uuid.uuid4()),
            "email": email_clean,
            "full_name": full_name,
            "hashed_password": hash_password(password),
            "role": UserRole.SUPER_ADMIN.value,
            "is_active": True,
            "profile": {
                "coins_balance": 0,
                "current_streak": 0,
                "longest_streak": 0,
                "subscription_plan": "FREE",
                "subscription_status": "ACTIVE",
                "enrolled_courses": [],
                "active_passes": [],
            },
            "admin_id": None,
            "subdomain": None,
            "organization_name": "Platform Owner",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
        await db.users.insert_one(new_user)
        print(f"Successfully created new Super Admin: '{email_clean}' with role 'super_admin'!")


async def main():
    parser = argparse.ArgumentParser(description="Manage PrepMagnet Super Admins")
    parser.add_argument("--list", action="store_true", help="List all current admins and super admins")
    parser.add_argument("--email", type=str, help="Email of the user to promote or create")
    parser.add_argument("--password", type=str, help="Password for the user (optional if promoting)")
    parser.add_argument("--name", type=str, default="Super Admin", help="Full name for new user")

    args = parser.parse_args()

    # Connect to MongoDB
    await db_manager.connect()

    try:
        if args.list or (not args.email):
            await list_admins()
        if args.email:
            await create_or_promote_super_admin(args.email, args.password, args.name)
    finally:
        await db_manager.close()


if __name__ == "__main__":
    asyncio.run(main())
