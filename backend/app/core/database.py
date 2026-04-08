from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

client = None
db = None

async def get_db():
    return db

async def init_db():
    global client, db
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db_name = settings.MONGODB_URI.rsplit("/", 1)[-1].split("?")[0] or "event_mgmt"
    db = client[db_name]
    await db.users.create_index("email", unique=True)
    await db.events.create_index("slug", unique=True)
    await db.tickets.create_index("event_id")
    await db.registrations.create_index([("event_id", 1), ("attendee_email", 1)], unique=True)
    await db.vendors.create_index("phone")
    if not await db.settings.find_one({"key": "org_name"}):
        await db.settings.insert_many([
            {"key": "app_name", "value": "EventHub"},
            {"key": "org_name", "value": "EventHub"},
            {"key": "currency", "value": "INR"},
            {"key": "gst_rate", "value": "18"},
        ])
