# models/user.py — User ORM model
from datetime import datetime
from database import db


class User(db.Model):
    __tablename__ = "users"

    id         = db.Column(db.Integer, primary_key=True, autoincrement=True)
    username   = db.Column(db.String(80), unique=True, nullable=False, index=True)
    password   = db.Column(db.String(255), nullable=False)
    role       = db.Column(db.String(10), nullable=False, default="student")
    branch     = db.Column(db.String(50), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    # Relationship — foreign_keys is explicit to avoid any future ambiguity.
    # StudentPerformance.student_id is the only FK to users.id.
    performance = db.relationship(
        "StudentPerformance",
        backref="user",
        uselist=False,
        cascade="all, delete-orphan",
        foreign_keys="[StudentPerformance.student_id]",
    )

    def to_dict(self):
        """Return a safe public representation (no password hash)."""
        return {
            "id":         self.id,
            "username":   self.username,
            "name":       self.username,   # frontend reads both 'username' and 'name'
            "role":       self.role,
            "branch":     self.branch,
            "batch":      self.branch,     # frontend reads both 'branch' and 'batch'
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f"<User id={self.id} username={self.username!r} role={self.role}>"
