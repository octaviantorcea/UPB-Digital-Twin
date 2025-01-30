import os

from dotenv import load_dotenv
from sqlalchemy import create_engine, Column, Integer, String, Boolean
from sqlalchemy.orm import sessionmaker, declarative_base

from backend.shared_models.scopes import Scopes

load_dotenv()


# database setup
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String, nullable=False)
    password = Column(String, nullable=False)
    email = Column(String, nullable=False)
    confirmed = Column(Boolean, default=False)
    scope = Column(String, default=Scopes.BASIC)
    tfa_enabled = Column(Boolean, default=False)
    secret = Column(String, nullable=False)


Base.metadata.create_all(bind=engine)


def get_all_registered_users_as_list():
    db = SessionLocal()
    users = db.query(User).all()
    db.close()

    return users
