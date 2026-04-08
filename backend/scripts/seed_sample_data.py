import asyncio, sys
sys.path.insert(0, ".")
from app.core.database import init_db, get_db

async def seed():
    await init_db()
    db = await get_db()
    print("Seed data for EventHub")

asyncio.run(seed())
