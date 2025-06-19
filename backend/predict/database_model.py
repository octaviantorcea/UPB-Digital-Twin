import os

from dotenv import load_dotenv
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime
from sqlalchemy.orm import sessionmaker, declarative_base

load_dotenv()

engine = create_engine(os.getenv("DATABASE_URL"))
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class TempPredictedValue(Base):
    __tablename__ = "TempPredictedValue"

    inc = Column(Integer, primary_key=True, autoincrement=True)
    value = Column(Float, nullable=False)
    location = Column(String, nullable=False)
    timestamp = Column(DateTime, nullable=False)


class HumidPredictedValue(Base):
    __tablename__ = "HumidPredictedValue"

    inc = Column(Integer, primary_key=True, autoincrement=True)
    value = Column(Float, nullable=False)
    location = Column(String, nullable=False)
    timestamp = Column(DateTime, nullable=False)


class PressPredictedValue(Base):
    __tablename__ = "PressPredictedValue"

    inc = Column(Integer, primary_key=True, autoincrement=True)
    value = Column(Float, nullable=False)
    location = Column(String, nullable=False)
    timestamp = Column(DateTime, nullable=False)


Base.metadata.create_all(bind=engine)
