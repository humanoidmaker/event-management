from fastapi import APIRouter, Depends, HTTPException, Query
from bson import ObjectId
from datetime import datetime, timezone
from app.core.database import get_db
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/vendors", tags=["vendors"])

def s(doc):
    if doc:
        doc["id"] = str(doc.pop("_id"))
        if "event_id" in doc and doc["event_id"]:
            doc["event_id"] = str(doc["event_id"])
    return doc

@router.post("/")
async def create_vendor(data: dict, user=Depends(get_current_user), db=Depends(get_db)):
    if not data.get("name"):
        raise HTTPException(400, "name is required")
    if not data.get("event_id"):
        raise HTTPException(400, "event_id is required")
    event = await db.events.find_one({"_id": ObjectId(data["event_id"])})
    if not event:
        raise HTTPException(404, "Event not found")
    valid_types = ["catering", "decoration", "sound", "photography", "lighting", "security", "transport", "other"]
    service_type = data.get("service_type", "other")
    if service_type not in valid_types:
        raise HTTPException(400, f"service_type must be one of: {', '.join(valid_types)}")
    now = datetime.now(timezone.utc)
    vendor = {
        "name": data["name"],
        "phone": data.get("phone", ""),
        "email": data.get("email", ""),
        "event_id": ObjectId(data["event_id"]),
        "service_type": service_type,
        "contract_amount": float(data.get("contract_amount", 0)),
        "paid_amount": float(data.get("paid_amount", 0)),
        "status": data.get("status", "contracted"),
        "created_at": now,
        "updated_at": now,
    }
    r = await db.vendors.insert_one(vendor)
    vendor["id"] = str(r.inserted_id)
    del vendor["_id"]
    vendor["event_id"] = str(vendor["event_id"])
    return {"success": True, "vendor": vendor}

@router.get("/")
async def list_vendors(
    event_id: str = Query(""),
    service_type: str = Query(""),
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    f = {}
    if event_id:
        f["event_id"] = ObjectId(event_id)
    if service_type:
        f["service_type"] = service_type
    docs = await db.vendors.find(f).sort("created_at", -1).to_list(500)
    return {"success": True, "vendors": [s(d) for d in docs]}

@router.get("/{vendor_id}")
async def get_vendor(vendor_id: str, user=Depends(get_current_user), db=Depends(get_db)):
    doc = await db.vendors.find_one({"_id": ObjectId(vendor_id)})
    if not doc:
        raise HTTPException(404, "Vendor not found")
    return {"success": True, "vendor": s(doc)}

@router.put("/{vendor_id}")
async def update_vendor(vendor_id: str, data: dict, user=Depends(get_current_user), db=Depends(get_db)):
    doc = await db.vendors.find_one({"_id": ObjectId(vendor_id)})
    if not doc:
        raise HTTPException(404, "Vendor not found")
    allowed = ["name", "phone", "email", "service_type", "contract_amount", "paid_amount", "status"]
    update = {}
    for k in allowed:
        if k in data:
            if k in ("contract_amount", "paid_amount"):
                update[k] = float(data[k])
            else:
                update[k] = data[k]
    update["updated_at"] = datetime.now(timezone.utc)
    await db.vendors.update_one({"_id": ObjectId(vendor_id)}, {"$set": update})
    updated = await db.vendors.find_one({"_id": ObjectId(vendor_id)})
    return {"success": True, "vendor": s(updated)}

@router.delete("/{vendor_id}")
async def delete_vendor(vendor_id: str, user=Depends(get_current_user), db=Depends(get_db)):
    r = await db.vendors.delete_one({"_id": ObjectId(vendor_id)})
    if r.deleted_count == 0:
        raise HTTPException(404, "Vendor not found")
    return {"success": True}
