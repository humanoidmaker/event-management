from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import settings
from app.core.database import init_db
from app.api import auth, settings as settings_api, events, tickets, registrations, vendors, budget

@asynccontextmanager
async def lifespan(a):
    await init_db()
    yield

app = FastAPI(title="EventHub API", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=settings.CORS_ORIGINS, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.include_router(auth.router)
app.include_router(settings_api.router)
app.include_router(events.router)
app.include_router(tickets.router)
app.include_router(registrations.router)
app.include_router(vendors.router)
app.include_router(budget.router)

@app.get("/api/health")
async def health():
    return {"status": "ok", "app": "EventHub"}

@app.get("/api/stats")
async def stats():
    from app.core.database import get_db as gdb
    from datetime import datetime, timezone
    db = await gdb()
    now = datetime.now(timezone.utc)
    total_events = await db.events.count_documents({})
    upcoming_events = await db.events.count_documents({"start_date": {"$gt": now}})
    ongoing_events = await db.events.count_documents({"start_date": {"$lte": now}, "end_date": {"$gte": now}})
    total_registrations = await db.registrations.count_documents({})
    checked_in = await db.registrations.count_documents({"status": "checked_in"})
    total_vendors = await db.vendors.count_documents({})
    rev_pipe = [
        {"$match": {"status": {"$ne": "cancelled"}}},
        {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}},
    ]
    rev_r = await db.registrations.aggregate(rev_pipe).to_list(1)
    total_revenue = rev_r[0]["total"] if rev_r else 0
    return {
        "stats": {
            "total_events": total_events,
            "upcoming_events": upcoming_events,
            "ongoing_events": ongoing_events,
            "total_registrations": total_registrations,
            "checked_in": checked_in,
            "total_vendors": total_vendors,
            "total_revenue": total_revenue,
        }
    }
