import os
from datetime import datetime

from dotenv import load_dotenv
from sqlalchemy import create_engine, Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import sessionmaker, declarative_base, relationship

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Issue(Base):
    __tablename__ = "issues"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    location = Column(String, nullable=False)
    title = Column(String, nullable=False)
    description = Column(String, nullable=False)
    reporter = Column(String, nullable=False)
    status = Column(String, default="Reported", nullable=False)
    created_at = Column(DateTime, default=datetime.now(), nullable=False)
    comments = relationship("Comment", back_populates="issue", cascade="all, delete-orphan")
    votes = relationship("Vote", back_populates="issue", cascade="all, delete-orphan")


class Comment(Base):
    __tablename__ = "comments"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    comment = Column(String, nullable=False)
    commenter = Column(String, nullable=False)
    issue_id = Column(Integer, ForeignKey("issues.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.now(), nullable=False)
    issue = relationship("Issue", back_populates="comments")


class Vote(Base):
    __tablename__ = "votes"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    upvote = Column(Boolean, nullable=False)  # True for upvote, False for downvote
    voter_id = Column(Integer, nullable=False)
    issue_id = Column(Integer, ForeignKey("issues.id"), nullable=False)
    issue = relationship("Issue", back_populates="votes")


Base.metadata.create_all(bind=engine)
