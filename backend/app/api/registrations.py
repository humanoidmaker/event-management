from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from datetime import datetime, timezone
from app.core.database import get_db
from app.utils.auth import get_current_user
import random
import string
import hashlib

router = APIRouter(prefix="/api/registrations", tags=["registrations"])

def s(doc):
    if doc:
        doc["id"] = str(doc.pop("_id"))
        for k in ["event_id", "ticket_id"]:
            if k in doc and doc[k]:
                doc[k] = str(doc[k])
    return doc

def generate_reg_number():
    return "REG-" + "".join(random.choices(string.digits, k=5))

def generate_qr_string(reg_number, event_id, attendee_email):
    raw = f"{reg_number}|{event_id}|{attendee_email}"
    return hashlib.sha256(raw.encode()).hexdigest()[:24].upper()

@router.post("/")
async def create_registration(data: dict, user=Depends(get_current_user), db=Depends(get_db)):
    required = ["event_id", "ticket_id", "attendee_name", "email", "phone"]
    for field in required:
        if not data.get(field):
            raise HTTPException(400, f"{field} is required")
    event_id = ObjectId(data["event_id"])
    ticket_id = ObjectId(data["ticket_id"])
    event = await db.events.find_one({"_id": event_id})
    if not event:
        raise HTTPException(404, "Event not found")
    now = datetime.now(timezone.utc)
    if event.get("registration_deadline") and now > event["registration_deadline"]:
        raise HTTPException(400, "Registration deadline has passed")
    ticket = await db.tickets.find_one({"_id": ticket_id, "event_id": event_id})
    if not ticket:
        raise HTTPException(404, "Ticket type not found for this event")
    quantity = int(data.get("quantity", 1))
    available = ticket.get("quantity", 0) - ticket.get("sold_count", 0)
    if quantity > available:
        raise HTTPException(400, f"Only {available} tickets available")
    existing = await db.registrations.find_one({"event_id": event_id, "attendee_email": data["email"]})
    if existing:
        raise HTTPException(400, "Email already registered for this event")
    settings_docs = await db.settings.find().to_list(20)
    cfg = {d["key"]: d["value"] for d in settings_docs}
    gst_rate = float(cfg.get("gst_rate", "18"))
    base_amount = ticket["price"] * quantity
    gst_amount = round(base_amount * gst_rate / 100, 2)
    total_amount = round(base_amount + gst_amount, 2)
    reg_number = generate_reg_number()
    while await db.registrations.find_one({"registration_number": reg_number}):
        reg_number = generate_reg_number()
    qr_string = generate_qr_string(reg_number, str(event_id), data["email"])
    registration = {
        "registration_number": reg_number,
        "event_id": event_id,
        "event_title": event.get("title", ""),
        "ticket_id": ticket_id,
        "ticket_name": ticket.get("name", ""),
        "attendee_name": data["attendee_name"],
        "attendee_email": data["email"],
        "attendee_phone": data["phone"],
        "quantity": quantity,
        "unit_price": ticket["price"],
        "base_amount": base_amount,
        "gst_rate": gst_rate,
        "gst_amount": gst_amount,
        "total_amount": total_amount,
        "status": "confirmed",
        "qr_string": qr_string,
        "checked_in_at": None,
        "created_at": now,
        "updated_at": now,
    }
    r = await db.registrations.insert_one(registration)
    await db.tickets.update_one({"_id": ticket_id}, {"$inc": {"sold_count": quantity}})
    registration["id"] = str(r.inserted_id)
    del registration["_id"]
    registration["event_id"] = str(registration["event_id"])
    registration["ticket_id"] = str(registration["ticket_id"])
    return {"success": True, "registration": registration}

@router.get("/event/{event_id}")
async def list_registrations(event_id: str, user=Depends(get_current_user), db=Depends(get_db)):
    docs = await db.registrations.find({"event_id": ObjectId(event_id)}).sort("created_at", -1).to_list(1000)
    return {"success": True, "registrations": [s(d) for d in docs]}

@router.get("/stats")
async def registration_stats(user=Depends(get_current_user), db=Depends(get_db)):
    total = await db.registrations.count_documents({})
    confirmed = await db.registrations.count_documents({"status": "confirmed"})
    checked_in = await db.registrations.count_documents({"status": "checked_in"})
    cancelled = await db.registrations.count_documents({"status": "cancelled"})
    revenue_pipe = [
        {"$match": {"status": {"$ne": "cancelled"}}},
        {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}},
    ]
    rev_r = await db.registrations.aggregate(revenue_pipe).to_list(1)
    total_revenue = rev_r[0]["total"] if rev_r else 0
    by_event_pipe = [
        {"$match": {"status": {"$ne": "cancelled"}}},
        {"$group": {"_id": "$event_id", "event_title": {"$first": "$event_title"}, "count": {"$sum": 1}, "revenue": {"$sum": "$total_amount"}}},
        {"$sort": {"count": -1}},
        {"$limit": 10},
    ]
    by_event = await db.registrations.aggregate(by_event_pipe).to_list(10)
    return {
        "success": True,
        "stats": {
            "total_registrations": total,
            "confirmed": confirmed,
            "checked_in": checked_in,
            "cancelled": cancelled,
            "total_revenue": total_revenue,
            "by_event": [{"event_id": str(e["_id"]), "event_title": e["event_title"], "count": e["count"], "revenue": e["revenue"]} for e in by_event],
        },
    }

@router.get("/{reg_id}")
async def get_registration(reg_id: str, user=Depends(get_current_user), db=Depends(get_db)):
    doc = await db.registrations.find_one({"_id": ObjectId(reg_id)})
    if not doc:
        raise HTTPException(404, "Registration not found")
    return {"success": True, "registration": s(doc)}

@router.put("/{reg_id}/check-in")
async def check_in(reg_id: str, user=Depends(get_current_user), db=Depends(get_db)):
    doc = await db.registrations.find_one({"_id": ObjectId(reg_id)})
    if not doc:
        raise HTTPException(404, "Registration not found")
    if doc.get("status") == "cancelled":
        raise HTTPException(400, "Cannot check in a cancelled registration")
    if doc.get("status") == "checked_in":
        raise HTTPException(400, "Already checked in")
    now = datetime.now(timezone.utc)
    await db.registrations.update_one(
        {"_id": ObjectId(reg_id)},
        {"$set": {"status": "checked_in", "checked_in_at": now, "updated_at": now}},
    )
    updated = await db.registrations.find_one({"_id": ObjectId(reg_id)})
    return {"success": True, "registration": s(updated)}

@router.put("/{reg_id}/cancel")
async def cancel_registration(reg_id: str, user=Depends(get_current_user), db=Depends(get_db)):
    doc = await db.registrations.find_one({"_id": ObjectId(reg_id)})
    if not doc:
        raise HTTPException(404, "Registration not found")
    if doc.get("status") == "cancelled":
        raise HTTPException(400, "Already cancelled")
    if doc.get("status") == "checked_in":
        raise HTTPException(400, "Cannot cancel after check-in")
    now = datetime.now(timezone.utc)
    await db.registrations.update_one(
        {"_id": ObjectId(reg_id)},
        {"$set": {"status": "cancelled", "updated_at": now}},
    )
    await db.tickets.update_one(
        {"_id": doc["ticket_id"]},
        {"$inc": {"sold_count": -doc.get("quantity", 1)}},
    )
    updated = await db.registrations.find_one({"_id": ObjectId(reg_id)})
    return {"success": True, "registration": s(updated)}
