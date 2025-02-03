from datetime import datetime
from enum import Enum
from typing import Optional, List

from pydantic import BaseModel


class IssueStatus(str, Enum):
    REPORTED = "Reported"
    IN_PROGRESS = "In Progress"
    SOLVED = "Solved"


class PushIssueRequest(BaseModel):
    location: str
    description: str
    receive_updates: Optional[bool] = False


class CommentResponse(BaseModel):
    id: int
    comment: str
    commenter: str


class IssueResponse(PushIssueRequest):
    id: int
    reporter: str
    status: IssueStatus
    created_at: datetime
    comments: List[CommentResponse]
    score: int
