import os
from typing import Annotated, List, Optional

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, Security, HTTPException, Depends
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session

from backend.reporting.database_model import SessionLocal, Issue, Comment, Vote
from backend.reporting.web_model import PushIssueRequest, IssueStatus, CommentResponse, IssueResponse, \
    PostCommentRequest
from backend.shared_models.scopes import Scopes
from backend.shared_models.token import TokenModel
from backend.utils.auth import get_authorization, get_current_user

load_dotenv()

security = HTTPBearer()

app = FastAPI()


def _get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.post("/push_issue")
def push_issue(
    is_registered: Annotated[bool, Security(get_authorization, scopes=[Scopes.STUDENT])],
    current_user: Annotated[TokenModel, Depends(get_current_user)],
    report_request: PushIssueRequest,
    db: Session = Depends(_get_db)
):
    if not is_registered:
        raise HTTPException(status_code=403, detail="Not registered")

    new_issue = Issue(
        location=report_request.location,
        title=report_request.title,
        description=report_request.description,
        reporter=f"{current_user.first_name} {current_user.last_name}"
    )

    db.add(new_issue)
    db.commit()
    db.refresh(new_issue)

    return {"message": f"Issue registered with id: {new_issue.id}"}


@app.post("/solving_issue/{issue_id}")
def solving_issue(
    is_admin: Annotated[bool, Security(get_authorization, scopes=[Scopes.ADMIN])],
    issue_id: int,
    db: Session = Depends(_get_db)
):
    if not is_admin:
        raise HTTPException(status_code=403, detail="You do not have permission to perform this action")

    issue = db.query(Issue).get(issue_id)

    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    issue.status = IssueStatus.IN_PROGRESS
    db.commit()

    return {"message": f"Issue {issue_id} status updated to in progress"}


@app.post("/resolve_issue/{issue_id}")
def resolve_issue(
    is_admin: Annotated[bool, Security(get_authorization, scopes=[Scopes.ADMIN])],
    issue_id: int,
    db: Session = Depends(_get_db)
):
    if not is_admin:
        raise HTTPException(status_code=403, detail="You do not have permission to perform this action")

    issue = db.query(Issue).get(issue_id)

    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    issue.status = IssueStatus.SOLVED
    db.commit()

    return {"message": f"Issue {issue_id} resolved successfully"}


@app.post("/comment")
def add_comment(
    post_comment_request: PostCommentRequest,
    is_registered: Annotated[bool, Security(get_authorization, scopes=[Scopes.STUDENT])],
    current_user: Annotated[TokenModel, Depends(get_current_user)],
    db: Session = Depends(_get_db)
):
    if not is_registered:
        raise HTTPException(status_code=403, detail="Not registered")

    issue = db.query(Issue).get(post_comment_request.issue_id)

    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    new_comment = Comment(
        comment=post_comment_request.comment,
        commenter=f"{current_user.first_name} {current_user.last_name}",
        issue_id=post_comment_request.issue_id
    )

    db.add(new_comment)
    db.commit()

    return {"message": "Comment added"}


@app.post("/upvote_issue/{issue_id}")
def upvote_issue(
    is_registered: Annotated[bool, Security(get_authorization, scopes=[Scopes.STUDENT])],
    current_user: Annotated[TokenModel, Depends(get_current_user)],
    issue_id: int,
    db: Session = Depends(_get_db)
):
    if not is_registered:
        raise HTTPException(status_code=403, detail="Not registered")

    existing_vote = db.query(Vote).filter(
        Vote.issue_id == issue_id, Vote.voter_id == current_user.username_id
    ).first()

    if existing_vote:
        existing_vote.upvote = True
    else:
        existing_vote = Vote(upvote=True, issue_id=issue_id, voter_id=current_user.username_id)
        db.add(existing_vote)

    db.commit()
    db.refresh(existing_vote)

    return {"message": f"Upvoted issue {issue_id}"}


@app.post("/downvote_issue/{issue_id}")
def downvote_issue(
        is_registered: Annotated[bool, Security(get_authorization, scopes=[Scopes.STUDENT])],
        current_user: Annotated[TokenModel, Depends(get_current_user)],
        issue_id: int,
        db: Session = Depends(_get_db)
):
    if not is_registered:
        raise HTTPException(status_code=403, detail="Not registered")

    existing_vote = db.query(Vote).filter(
        Vote.issue_id == issue_id, Vote.voter_id == current_user.username_id
    ).first()

    if existing_vote:
        existing_vote.upvote = False
    else:
        existing_vote = Vote(upvote=False, issue_id=issue_id, voter_id=current_user.username_id)
        db.add(existing_vote)

    db.commit()
    db.refresh(existing_vote)

    return {"message": f"Downvoted issue {issue_id}"}


@app.post("/get_issues")
def get_issues(
    location: Optional[str] = None,
    db: Session = Depends(_get_db)
) -> List[IssueResponse]:
    if location:
        issues = db.query(Issue).filter_by(location=location).all()
    else:
        issues = db.query(Issue).all()

    if not issues:
        return []

    result = []
    for issue in issues:
        comments = [CommentResponse(id=c.id, comment=c.comment, commenter=c.commenter) for c in issue.comments]
        upvotes = sum(1 for v in issue.votes if v.upvote)
        downvotes = sum(1 for v in issue.votes if not v.upvote)
        score = upvotes - downvotes

        result.append(
            IssueResponse(
                id=issue.id,
                location=issue.location,
                title=issue.title,
                description=issue.description,
                reporter=issue.reporter,
                status=issue.status,
                created_at=issue.created_at,
                comments=comments,
                score=score
            )
        )

    return result


if __name__ == "__main__":
    uvicorn.run(app, host=os.getenv("HOST"), port=int(os.getenv("PORT")))
