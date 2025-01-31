import os
from concurrent.futures import Future
from datetime import date, timedelta, datetime
from queue import Queue
from threading import Thread

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.security import HTTPBearer
from sqlalchemy import inspect

from backend.reservation.database_model import create_room_table, SessionLocal, engine, Base
from backend.reservation.web_model import ReservationRequest, TimeInterval, ReservationResponse

load_dotenv()
security = HTTPBearer()

app = FastAPI()


# TODO: add token verification, reserve room only for teachers

reservation_queue = Queue()


def _process_reservations():
    while True:
        res_future, reservation = reservation_queue.get(block=True)

        room_name = reservation.room_name
        start_date = reservation.start_date
        end_date = reservation.end_date
        reserved_by = reservation.name

        day_of_reservation = start_date.date()
        start_time = start_date.time()
        end_time = end_date.time()

        if start_time >= end_time:
            res_future.set_exception(HTTPException(status_code=400, detail="Start time must be before end time."))
            continue

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
                res_future.set_exception(HTTPException(status_code=400, detail="Time slot is already booked."))
                continue

            reservation = RoomReservation(
                day_of_reservation=day_of_reservation,
                start_time=start_time,
                end_time=end_time,
                reserved_by=reserved_by
            )
            db.add(reservation)

            db.commit()

            res_future.set_result({"message": "Reservation successfully!", "reservation_id": reservation.id})

        except Exception as e:
            db.rollback()
            res_future.set_exception(HTTPException(status_code=500, detail=str(e)))

        finally:
            db.close()
            reservation_queue.task_done()


@app.post("/reserve")
def reserve_room(
    reservation: ReservationRequest
):
    res_future = Future()
    reservation_queue.put((res_future, reservation))

    return res_future.result()


def _get_reservations(db, RoomReservation, start_date, end_date) -> dict[date, list[ReservationResponse]]:
    reservations = db.query(RoomReservation).filter(
        RoomReservation.day_of_reservation >= start_date,
        RoomReservation.day_of_reservation <= end_date
    ).order_by(RoomReservation.day_of_reservation, RoomReservation.start_time).all()

    room_name = RoomReservation.__tablename__

    reservations_by_day = {}
    for reservation in reservations:
        day = reservation.day_of_reservation

        if day not in reservations_by_day:
            reservations_by_day[day] = []

        reservations_by_day[day].append(
            ReservationResponse(
                room_name=room_name,
                start_date=datetime.combine(day, reservation.start_time),
                end_date=datetime.combine(day, reservation.end_time),
                name=reservation.reserved_by,
                day=day,
                created_at=reservation.created_at,
            )
        )

    return reservations_by_day


def _get_end_date(start_date: date, time_interval: TimeInterval) -> date:
    if time_interval == TimeInterval.DAY:
        return start_date
    elif time_interval == TimeInterval.WEEK:
        return start_date + timedelta(days=6)
    elif time_interval == TimeInterval.MONTH:
        return start_date + timedelta(days=30)
    else:
        raise HTTPException(status_code=400, detail="Invalid time interval.")


@app.get("/get_reservations_for_interval")
def get_reservations_for_interval(
    room_name: str,
    time_interval: TimeInterval = Query(..., description="Time interval"),
    start_date: date = Query(..., description="Start date of the interval (YYYY-MM-DD)")
) -> dict[date, list[ReservationResponse]]:
    end_date = _get_end_date(start_date, time_interval)

    RoomReservation = create_room_table(room_name)

    db = SessionLocal()

    try:
        inspector = inspect(engine)
        if not inspector.has_table(room_name):
            return {}

        return _get_reservations(db, RoomReservation, start_date, end_date)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        db.close()


@app.get("/show_reservations")
def show_reservations(
    room_name: str,
    time_interval: TimeInterval = Query(..., description="Time interval"),
    start_date: date = Query(..., description="Start date of the interval (YYYY-MM-DD)")
):
    end_date = _get_end_date(start_date, time_interval)

    RoomReservation = create_room_table(room_name)

    db = SessionLocal()

    try:
        inspector = inspect(engine)
        if not inspector.has_table(room_name):
            return {"reservations": []}

        reservations_by_day = _get_reservations(db, RoomReservation, start_date, end_date)

        result = []
        for day, reservations in reservations_by_day.items():
            table = f"Reservations for {room_name} on {day}:\n"
            table += "-" * 40 + "\n"
            table += f"{'Time Interval':<20} | {'Reserved By':<15}\n"
            table += "-" * 40 + "\n"

            for reservation in reservations:
                time_interval = (f"{reservation.start_date.time().strftime('%H:%M')} - "
                                 f"{reservation.end_date.time().strftime('%H:%M')}")
                table += f"{time_interval:<20} | {reservation.name:<15}\n"

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
    Thread(target=_process_reservations, daemon=True).start()
    uvicorn.run(app, host=os.getenv("HOST"), port=int(os.getenv("PORT")))
