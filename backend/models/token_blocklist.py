# models/token_blocklist.py — Revoked JWT tokens (for logout support)
from datetime import datetime
from database import db


class TokenBlocklist(db.Model):
    __tablename__ = "token_blocklist"

    id         = db.Column(db.Integer, primary_key=True, autoincrement=True)
    jti        = db.Column(db.String(36), unique=True, nullable=False, index=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    def __repr__(self):
        return f"<TokenBlocklist jti={self.jti!r}>"
