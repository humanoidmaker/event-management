from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from datetime import datetime, timezone
from app.core.database import get_db
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/tickets", tags=["tickets"])

def s(doc):
    if doc:
        doc["id"] = str(doc.pop("_id"))
        if "event_id" in doc and doc["event_id"]:
            doc["event_id"] = str(doc["event_id"])
    return doc

@router.post("/")
async def create_ticket(data: dict, user=Depends(get_current_user), db=Depends(get_db)):
    if not data.get("event_id"):
        raise HTTPException(400, "event_id is required")
    if not data.get("name"):
        raise HTTPException(400, "name is required")
    event = await db.events.find_one({"_id": ObjectId(data["event_id"])})
    if not event:
        raise HTTPException(404, "Event not found")
    now = datetime.now(timezone.utc)
    ticket = {
        "event_id": ObjectId(data["event_id"]),
        "name": data["name"],
        "price": float(data.get("price", 0)),
        "quantity": int(data.get("quantity", 100)),
        "sold_count": 0,
        "description": data.get("description", ""),
        "benefits": data.get("benefits", []),
        "created_at": now,
        "updated_at": now,
    }
    r = await db.tickets.insert_one(ticket)
    ticket["id"] = str(r.inserted_id)
    del ticket["_id"]
    ticket["event_id"] = str(ticket["event_id"])
    return {"success": True, "ticket": ticket}

@router.get("/event/{event_id}")
async def list_tickets(event_id: str, user=Depends(get_current_user), db=Depends(get_db)):
    docs = await db.tickets.find({"event_id": ObjectId(event_id)}).to_list(100)
    return {"success": True, "tickets": [s(d) for d in docs]}

@router.get("/{ticket_id}")
async def get_ticket(ticket_id: str, user=Depends(get_current_user), db=Depends(get_db)):
    doc = await db.tickets.find_one({"_id": ObjectId(ticket_id)})
    if not doc:
        raise HTTPException(404, "Ticket not found")
    return {"success": True, "ticket": s(doc)}

@router.put("/{ticket_id}")
async def update_ticket(ticket_id: str, data: dict, user=Depends(get_current_user), db=Depends(get_db)):
    doc = await db.tickets.find_one({"_id": ObjectId(ticket_id)})
    if not doc:
        raise HTTPException(404, "Ticket not found")
    allowed = ["name", "price", "quantity", "description", "benefits"]
    update = {}
    for k in allowed:
        if k in data:
            if k == "price":
                update[k] = float(data[k])
            elif k == "quantity":
                update[k] = int(data[k])
            else:
                update[k] = data[k]
    update["updated_at"] = datetime.now(timezone.utc)
    await db.tickets.update_one({"_id": ObjectId(ticket_id)}, {"$set": update})
    updated = await db.tickets.find_one({"_id": ObjectId(ticket_id)})
    return {"success": True, "ticket": s(updated)}

@router.delete("/{ticket_id}")
async def delete_ticket(ticket_id: str, user=Depends(get_current_user), db=Depends(get_db)):
    r = await db.tickets.delete_one({"_id": ObjectId(ticket_id)})
    if r.deleted_count == 0:
        raise HTTPException(404, "Ticket not found")
    return {"success": True}
