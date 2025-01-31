import os
from datetime import date, timedelta

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.security import HTTPBearer
from sqlalchemy import inspect

from backend.reservation.database_model import create_room_table, SessionLocal, engine, Base
from backend.reservation.web_model import ReservationRequest, TimeInterval

load_dotenv()
security = HTTPBearer()

app = FastAPI()


@app.post("/reserve")
def reserve_room(
    reservation: ReservationRequest
):
    room_name = reservation.room_name
    start_date = reservation.start_date
    end_date = reservation.end_date
    reserved_by = reservation.name

    day_of_reservation = start_date.date()
    start_time = start_date.time()
    end_time = end_date.time()

    if start_time >= end_time:
        raise HTTPException(status_code=400, detail="Start time must be before end time.")

    RoomReservation = create_room_table(room_name)

    db = SessionLocal()

    try:
        inspector = inspect(engine)
        if not inspector.has_table(room_name):
            Base.metadata.create_all(bind=engine, tables=[RoomReservation.__table__])

        overlapping_reservations = db.query(RoomReservation).filter(
            RoomReservation.day_of_reservation == day_of_reservation,
            RoomReservation.start_time < end_date,
            RoomReservation.end_time > start_time
        ).all()

        if overlapping_reservations:
            raise HTTPException(status_code=400, detail="Time slot is already booked.")

        reservation = RoomReservation(
            day_of_reservation=day_of_reservation,
            start_time=start_time,
            end_time=end_time,
            reserved_by=reserved_by
        )
        db.add(reservation)
        db.commit()

        return {"message": "Reservation successfully!", "reservation_id": reservation.id}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        db.close()


@app.get("/show_reservations")
def show_reservations(
    room_name: str,
    time_interval: TimeInterval = Query(..., description="Time interval"),
    start_date: date = Query(..., description="Start date of the interval (YYYY-MM-DD)")
):
    if time_interval == TimeInterval.DAY:
        end_date = start_date
    elif time_interval == TimeInterval.WEEK:
        end_date = start_date + timedelta(days=6)
    elif time_interval == TimeInterval.MONTH:
        end_date = start_date + timedelta(days=30)
    else:
        raise HTTPException(status_code=400, detail="Invalid time interval.")

    RoomReservation = create_room_table(room_name)

    db = SessionLocal()

    try:
        reservations = db.query(RoomReservation).filter(
            RoomReservation.day_of_reservation >= start_date,
            RoomReservation.day_of_reservation <= end_date
        ).order_by(RoomReservation.day_of_reservation, RoomReservation.start_time).all()

        reservations_by_day = {}
        for reservation in reservations:
            day = reservation.day_of_reservation

            if day not in reservations_by_day:
                reservations_by_day[day] = []

            reservations_by_day[day].append(reservation)

        result = []
        for day, reservations in reservations_by_day.items():
            table = f"Reservations for {room_name} on {day}:\n"
            table += "-" * 40 + "\n"
            table += f"{'Time Interval':<20} | {'Reserved By':<15}\n"
            table += "-" * 40 + "\n"

            for reservation in reservations:
                time_interval = f"{reservation.start_time.strftime('%H:%M')} - {reservation.end_time.strftime('%H:%M')}"
                table += f"{time_interval:<20} | {reservation.reserved_by:<15}\n"

            table += "-" * 40 + "\n"
            result.append(table)

        for res in result:
            print(res)
        return {"reservations": result}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        db.close()


if __name__ == '__main__':
    uvicorn.run(app, host=os.getenv("HOST"), port=int(os.getenv("PORT")))
