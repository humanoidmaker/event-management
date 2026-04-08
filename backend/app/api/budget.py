from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from datetime import datetime, timezone
from app.core.database import get_db
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/budget", tags=["budget"])

def s(doc):
    if doc:
        doc["id"] = str(doc.pop("_id"))
        if "event_id" in doc and doc["event_id"]:
            doc["event_id"] = str(doc["event_id"])
    return doc

@router.post("/")
async def create_budget_item(data: dict, user=Depends(get_current_user), db=Depends(get_db)):
    if not data.get("event_id"):
        raise HTTPException(400, "event_id is required")
    if not data.get("category"):
        raise HTTPException(400, "category is required")
    event = await db.events.find_one({"_id": ObjectId(data["event_id"])})
    if not event:
        raise HTTPException(404, "Event not found")
    now = datetime.now(timezone.utc)
    item = {
        "event_id": ObjectId(data["event_id"]),
        "category": data["category"],
        "description": data.get("description", ""),
        "estimated_amount": float(data.get("estimated_amount", 0)),
        "actual_amount": float(data.get("actual_amount", 0)),
        "created_at": now,
        "updated_at": now,
    }
    r = await db.budget_items.insert_one(item)
    item["id"] = str(r.inserted_id)
    del item["_id"]
    item["event_id"] = str(item["event_id"])
    return {"success": True, "budget_item": item}

@router.get("/event/{event_id}")
async def list_budget_items(event_id: str, user=Depends(get_current_user), db=Depends(get_db)):
    docs = await db.budget_items.find({"event_id": ObjectId(event_id)}).sort("category", 1).to_list(500)
    return {"success": True, "budget_items": [s(d) for d in docs]}

@router.get("/event/{event_id}/summary")
async def budget_summary(event_id: str, user=Depends(get_current_user), db=Depends(get_db)):
    eid = ObjectId(event_id)
    event = await db.events.find_one({"_id": eid})
    if not event:
        raise HTTPException(404, "Event not found")
    items = await db.budget_items.find({"event_id": eid}).to_list(500)
    total_estimated = sum(i.get("estimated_amount", 0) for i in items)
    total_actual = sum(i.get("actual_amount", 0) for i in items)
    by_category = {}
    for item in items:
        cat = item.get("category", "Other")
        if cat not in by_category:
            by_category[cat] = {"estimated": 0, "actual": 0, "count": 0}
        by_category[cat]["estimated"] += item.get("estimated_amount", 0)
        by_category[cat]["actual"] += item.get("actual_amount", 0)
        by_category[cat]["count"] += 1
    # Add vendor costs
    vendor_pipe = [
        {"$match": {"event_id": eid}},
        {"$group": {"_id": None, "contract_total": {"$sum": "$contract_amount"}, "paid_total": {"$sum": "$paid_amount"}}},
    ]
    vendor_r = await db.vendors.aggregate(vendor_pipe).to_list(1)
    vendor_contract = vendor_r[0]["contract_total"] if vendor_r else 0
    vendor_paid = vendor_r[0]["paid_total"] if vendor_r else 0
    # Revenue from registrations
    rev_pipe = [
        {"$match": {"event_id": eid, "status": {"$ne": "cancelled"}}},
        {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}},
    ]
    rev_r = await db.registrations.aggregate(rev_pipe).to_list(1)
    total_revenue = rev_r[0]["total"] if rev_r else 0
    return {
        "success": True,
        "summary": {
            "event_title": event.get("title", ""),
            "total_estimated": round(total_estimated, 2),
            "total_actual": round(total_actual, 2),
            "variance": round(total_estimated - total_actual, 2),
            "vendor_contract_total": round(vendor_contract, 2),
            "vendor_paid_total": round(vendor_paid, 2),
            "vendor_pending": round(vendor_contract - vendor_paid, 2),
            "total_revenue": round(total_revenue, 2),
            "net_profit": round(total_revenue - total_actual - vendor_paid, 2),
            "by_category": [{"category": k, **v} for k, v in by_category.items()],
            "item_count": len(items),
        },
    }

@router.get("/{item_id}")
async def get_budget_item(item_id: str, user=Depends(get_current_user), db=Depends(get_db)):
    doc = await db.budget_items.find_one({"_id": ObjectId(item_id)})
    if not doc:
        raise HTTPException(404, "Budget item not found")
    return {"success": True, "budget_item": s(doc)}

@router.put("/{item_id}")
async def update_budget_item(item_id: str, data: dict, user=Depends(get_current_user), db=Depends(get_db)):
    doc = await db.budget_items.find_one({"_id": ObjectId(item_id)})
    if not doc:
        raise HTTPException(404, "Budget item not found")
    allowed = ["category", "description", "estimated_amount", "actual_amount"]
    update = {}
    for k in allowed:
        if k in data:
            if k in ("estimated_amount", "actual_amount"):
                update[k] = float(data[k])
            else:
                update[k] = data[k]
    update["updated_at"] = datetime.now(timezone.utc)
    await db.budget_items.update_one({"_id": ObjectId(item_id)}, {"$set": update})
    updated = await db.budget_items.find_one({"_id": ObjectId(item_id)})
    return {"success": True, "budget_item": s(updated)}

@router.delete("/{item_id}")
async def delete_budget_item(item_id: str, user=Depends(get_current_user), db=Depends(get_db)):
    r = await db.budget_items.delete_one({"_id": ObjectId(item_id)})
    if r.deleted_count == 0:
        raise HTTPException(404, "Budget item not found")
    return {"success": True}
