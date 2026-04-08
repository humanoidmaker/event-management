import asyncio, sys, random
from datetime import datetime, timezone, timedelta
sys.path.insert(0, ".")
from app.core.database import init_db, get_db

EVENTS = [
    ("Tech Innovation Summit", "conference", "Convention Center Hall A", 500, True),
    ("UI/UX Design Workshop", "workshop", "Creative Hub Room 3", 50, True),
    ("Music Night Live", "concert", "Open Air Amphitheatre", 200, True),
    ("Startup Pitch Day", "meetup", "Co-Work Space Hall", 100, True),
    ("Annual Sports Meet", "sports", "City Stadium", 300, True),
]

TICKET_TYPES = {
    "Tech Innovation Summit": [("General", 999, 300), ("VIP", 1999, 100), ("Student", 499, 100)],
    "UI/UX Design Workshop": [("Standard", 499, 40), ("Premium", 799, 10)],
    "Music Night Live": [("General", 299, 150), ("VIP", 599, 50)],
    "Startup Pitch Day": [("Free Entry", 0, 80), ("VIP", 199, 20)],
    "Annual Sports Meet": [("Participant", 199, 200), ("Spectator", 99, 100)],
}

NAMES = ["Aarav Sharma", "Diya Patel", "Vihaan Reddy", "Ananya Nair", "Arjun Desai", "Ishita Gupta", "Kabir Singh", "Myra Joshi", "Reyansh Verma", "Saanvi Pillai", "Dhruv Kumar", "Kiara Bhat", "Aditya Rao", "Navya Iyer", "Vivaan Menon", "Siya Das", "Krishna Kapoor", "Riya Nair", "Ayan Mehta", "Nisha Verma", "Tanvi Singh", "Rohan Gupta", "Priya Desai", "Karthik Rao", "Anvi Sharma", "Dev Iyer", "Mira Patel", "Aryan Joshi", "Pooja Nair", "Rahul Kumar", "Sneha Reddy", "Vikram Bhat", "Lakshmi Das", "Amit Pillai", "Kavita Menon", "Sanjay Gupta", "Divya Verma", "Harish Kapoor", "Meera Singh", "Arun Rao", "Pallavi Iyer", "Nikhil Sharma", "Ritu Patel", "Mohan Desai", "Swathi Nair", "Gaurav Kumar", "Neha Reddy", "Tarun Joshi", "Bhavna Bhat", "Vinod Menon"]

async def seed():
    await init_db()
    db = await get_db()
    if await db.events.count_documents({}) > 0:
        print("Data exists"); return

    now = datetime.now(timezone.utc)

    for i, (title, etype, venue, max_att, published) in enumerate(EVENTS):
        start = now + timedelta(days=random.randint(-5, 30))
        slug = title.lower().replace(" ", "-").replace("/", "-")
        event = await db.events.insert_one({
            "title": title, "slug": slug, "description": f"Join us for {title}!",
            "event_type": etype, "venue_name": venue, "venue_address": f"{venue}, Business District",
            "start_date": start.isoformat(), "end_date": (start + timedelta(hours=random.randint(4, 12))).isoformat(),
            "max_attendees": max_att, "is_published": published,
            "registration_deadline": (start - timedelta(days=1)).isoformat(),
            "created_at": now - timedelta(days=random.randint(10, 30)),
        })
        event_id = str(event.inserted_id)

        # Tickets
        ticket_ids = []
        for tname, price, qty in TICKET_TYPES.get(title, [("General", 499, 50)]):
            t = await db.tickets.insert_one({
                "event_id": event_id, "name": tname, "price": price, "quantity": qty,
                "sold_count": 0, "description": f"{tname} access", "benefits": [],
            })
            ticket_ids.append({"id": str(t.inserted_id), "name": tname, "price": price})

        # Registrations
        reg_count = random.randint(5, 15)
        for j in range(reg_count):
            name = NAMES[(i * 10 + j) % len(NAMES)]
            ticket = random.choice(ticket_ids)
            gst = round(ticket["price"] * 0.18, 2)
            status = random.choice(["confirmed", "confirmed", "confirmed", "checked_in", "cancelled"])
            await db.registrations.insert_one({
                "event_id": event_id, "ticket_id": ticket["id"],
                "attendee_name": name, "attendee_email": f"{name.split()[0].lower()}{j}@example.com",
                "attendee_phone": f"987654{(i*10+j):04d}", "quantity": 1,
                "total": round(ticket["price"] + gst, 2), "gst": gst,
                "registration_number": f"REG-{10000+i*10+j}",
                "qr_string": f"REG-{10000+i*10+j}-{event_id[:8]}",
                "status": status,
                "check_in_time": now.isoformat() if status == "checked_in" else None,
                "created_at": now - timedelta(days=random.randint(1, 20)),
            })
            await db.tickets.update_one({"_id": __import__("bson").ObjectId(ticket["id"])}, {"$inc": {"sold_count": 1}})

    # Vendors
    for name, service, contract, paid in [
        ("Spice Caterers", "catering", 50000, 30000), ("SoundWave Audio", "sound", 25000, 25000),
        ("SnapShot Photography", "photography", 15000, 10000), ("DecorArt", "decoration", 35000, 20000),
        ("PrintFast", "printing", 8000, 8000), ("LightUp Events", "decoration", 20000, 15000),
        ("QuickBite Snacks", "catering", 30000, 30000), ("CamCrew Films", "photography", 40000, 20000),
        ("BeatBox DJ", "sound", 18000, 18000), ("FloraCraft", "decoration", 12000, 0),
    ]:
        events_list = await db.events.find().to_list(5)
        ev = random.choice(events_list)
        await db.vendors.insert_one({
            "name": name, "phone": f"987655{random.randint(1000,9999)}", "email": f"{name.split()[0].lower()}@example.com",
            "event_id": str(ev["_id"]), "service_type": service,
            "contract_amount": contract, "paid_amount": paid,
            "status": "paid" if paid >= contract else "pending",
        })

    # Budget items
    for ev in await db.events.find().to_list(5):
        for cat, est in [("Venue", random.randint(20000, 100000)), ("Catering", random.randint(30000, 80000)), ("Sound & AV", random.randint(10000, 30000)), ("Decoration", random.randint(15000, 40000)), ("Marketing", random.randint(5000, 20000))]:
            actual = round(est * random.uniform(0.8, 1.2))
            await db.budget.insert_one({"event_id": str(ev["_id"]), "category": cat, "description": f"{cat} expenses", "estimated_amount": est, "actual_amount": actual})

    print(f"Seeded: 5 events with tickets, 50 registrations, 10 vendors, budget items")

asyncio.run(seed())
