import os
from datetime import datetime

from dotenv import load_dotenv
from sqlalchemy import create_engine, Column, Integer, Date, Time, String, DateTime
from sqlalchemy.orm import sessionmaker, declarative_base

load_dotenv()

engine = create_engine(os.getenv("DATABASE_URL"), echo=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def create_room_table(room_name: str):
    class RoomReservation(Base):
        __tablename__ = room_name
        __table_args__ = {'extend_existing': True}

        id = Column(Integer, primary_key=True, autoincrement=True)
        day_of_reservation = Column(Date, nullable=False)
        start_time = Column(Time, nullable=False)
        end_time = Column(Time, nullable=False)
        reserved_by = Column(String, nullable=False)
        created_at = Column(DateTime, default=datetime.now())

    return RoomReservation
