from fastapi import APIRouter, Depends, HTTPException, Query
from bson import ObjectId
from datetime import datetime, timezone
from app.core.database import get_db
from app.utils.auth import get_current_user
import re

router = APIRouter(prefix="/api/events", tags=["events"])

def s(doc):
    if doc:
        doc["id"] = str(doc.pop("_id"))
    return doc

def slugify(text):
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[-\s]+', '-', text)
    return text

@router.post("/")
async def create_event(data: dict, user=Depends(get_current_user), db=Depends(get_db)):
    if not data.get("title"):
        raise HTTPException(400, "title is required")
    slug = data.get("slug") or slugify(data["title"])
    existing = await db.events.find_one({"slug": slug})
    if existing:
        slug = f"{slug}-{int(datetime.now(timezone.utc).timestamp())}"
    valid_types = ["conference", "workshop", "seminar", "concert", "meetup"]
    event_type = data.get("event_type", "conference")
    if event_type not in valid_types:
        raise HTTPException(400, f"event_type must be one of: {', '.join(valid_types)}")
    now = datetime.now(timezone.utc)
    start_date = data.get("start_date")
    end_date = data.get("end_date")
    reg_deadline = data.get("registration_deadline")
    if isinstance(start_date, str):
        try:
            start_date = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
        except Exception:
            start_date = now
    if isinstance(end_date, str):
        try:
            end_date = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
        except Exception:
            end_date = start_date
    if isinstance(reg_deadline, str):
        try:
            reg_deadline = datetime.fromisoformat(reg_deadline.replace("Z", "+00:00"))
        except Exception:
            reg_deadline = start_date
    event = {
        "title": data["title"],
        "slug": slug,
        "description": data.get("description", ""),
        "event_type": event_type,
        "venue_name": data.get("venue_name", ""),
        "venue_address": data.get("venue_address", ""),
        "start_date": start_date or now,
        "end_date": end_date or now,
        "max_attendees": int(data.get("max_attendees", 100)),
        "is_published": data.get("is_published", False),
        "registration_deadline": reg_deadline or start_date or now,
        "created_at": now,
        "updated_at": now,
    }
    r = await db.events.insert_one(event)
    event["id"] = str(r.inserted_id)
    del event["_id"]
    return {"success": True, "event": event}

@router.get("/")
async def list_events(
    status: str = Query(""),
    type: str = Query(""),
    q: str = Query(""),
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    f = {}
    now = datetime.now(timezone.utc)
    if status == "upcoming":
        f["start_date"] = {"$gt": now}
    elif status == "ongoing":
        f["start_date"] = {"$lte": now}
        f["end_date"] = {"$gte": now}
    elif status == "past":
        f["end_date"] = {"$lt": now}
    if type:
        f["event_type"] = type
    if q:
        regex = {"$regex": q, "$options": "i"}
        f["$or"] = [{"title": regex}, {"description": regex}, {"venue_name": regex}]
    docs = await db.events.find(f).sort("start_date", -1).to_list(500)
    return {"success": True, "events": [s(d) for d in docs]}

@router.get("/{event_id}")
async def get_event(event_id: str, db=Depends(get_db)):
    doc = await db.events.find_one({"_id": ObjectId(event_id)})
    if not doc:
        raise HTTPException(404, "Event not found")
    eid = doc["_id"]
    ticket_count = await db.tickets.count_documents({"event_id": eid})
    reg_count = await db.registrations.count_documents({"event_id": eid})
    total_sold_pipe = [{"$match": {"event_id": eid}}, {"$group": {"_id": None, "total": {"$sum": "$sold_count"}}}]
    sold_r = await db.tickets.aggregate(total_sold_pipe).to_list(1)
    total_sold = sold_r[0]["total"] if sold_r else 0
    checked_in = await db.registrations.count_documents({"event_id": eid, "status": "checked_in"})
    event = s(doc)
    event["ticket_types"] = ticket_count
    event["total_registrations"] = reg_count
    event["total_tickets_sold"] = total_sold
    event["checked_in_count"] = checked_in
    return {"success": True, "event": event}

@router.put("/{event_id}")
async def update_event(event_id: str, data: dict, user=Depends(get_current_user), db=Depends(get_db)):
    doc = await db.events.find_one({"_id": ObjectId(event_id)})
    if not doc:
        raise HTTPException(404, "Event not found")
    allowed = ["title", "description", "event_type", "venue_name", "venue_address", "start_date", "end_date", "max_attendees", "is_published", "registration_deadline"]
    update = {}
    for k in allowed:
        if k in data:
            val = data[k]
            if k in ("start_date", "end_date", "registration_deadline") and isinstance(val, str):
                try:
                    val = datetime.fromisoformat(val.replace("Z", "+00:00"))
                except Exception:
                    continue
            if k == "max_attendees":
                val = int(val)
            update[k] = val
    if "title" in update and update["title"] != doc.get("title"):
        new_slug = slugify(update["title"])
        existing = await db.events.find_one({"slug": new_slug, "_id": {"$ne": ObjectId(event_id)}})
        if existing:
            new_slug = f"{new_slug}-{int(datetime.now(timezone.utc).timestamp())}"
        update["slug"] = new_slug
    update["updated_at"] = datetime.now(timezone.utc)
    await db.events.update_one({"_id": ObjectId(event_id)}, {"$set": update})
    updated = await db.events.find_one({"_id": ObjectId(event_id)})
    return {"success": True, "event": s(updated)}

@router.delete("/{event_id}")
async def delete_event(event_id: str, user=Depends(get_current_user), db=Depends(get_db)):
    eid = ObjectId(event_id)
    r = await db.events.delete_one({"_id": eid})
    if r.deleted_count == 0:
        raise HTTPException(404, "Event not found")
    await db.tickets.delete_many({"event_id": eid})
    await db.registrations.delete_many({"event_id": eid})
    await db.vendors.delete_many({"event_id": eid})
    await db.budget_items.delete_many({"event_id": eid})
    return {"success": True}
