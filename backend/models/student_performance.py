# models/student_performance.py
from datetime import datetime
from database import db


class StudentPerformance(db.Model):
    __tablename__ = "student_performance"

    id                = db.Column(db.Integer, primary_key=True, autoincrement=True)

    # ── Single FK to users.id — the only FK SQLAlchemy needs for the relationship ──
    student_id        = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # username is kept as a plain denormalised cache column — no FK constraint.
    # Removing the FK eliminates the AmbiguousForeignKeysError and the risky
    # ON UPDATE CASCADE behaviour that caused the SQLAlchemy join ambiguity.
    username          = db.Column(db.String(80), nullable=False, index=True)

    attendance        = db.Column(db.Float, nullable=False, default=0)
    study_hours       = db.Column(db.Float, nullable=False, default=0)
    # test_score is the canonical column name (was: prev_score / internal_marks)
    test_score        = db.Column(db.Float, nullable=False, default=0)
    assignment_score  = db.Column(db.Float, nullable=False, default=0)
    prediction_result = db.Column(db.String(20), nullable=False, default="Unanalyzed")
    risk_percentage   = db.Column(db.Float, nullable=False, default=0)
    created_at        = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    def to_dict(self, user=None, analysis=None):
        perf_score = self._compute_performance_score()

        base = {
            "id":               self.id,
            "student_id":       self.student_id,
            "username":         self.username,
            "name":             self.username,
            "attendance":       self.attendance,
            "study_hours":      self.study_hours,
            # All legacy names map to the single test_score column
            "test_score":           self.test_score,
            "prev_score":           self.test_score,
            "internal_marks":       self.test_score,
            # Both legacy names map to assignment_score
            "assignment_score":         self.assignment_score,
            "assignments_completed":    self.assignment_score,
            "prediction_result":  self.prediction_result,
            "risk_percentage":    self.risk_percentage,
            "created_at":         self.created_at.isoformat() if self.created_at else None,
            # Computed / alias fields consumed by frontend
            "performance_score":      perf_score,
            "predicted_performance":  perf_score,
            "category":               self.prediction_result,
            "risk_level":             self.prediction_result,
        }

        if user:
            base.update({
                "branch": user.branch,
                "batch":  user.branch,
                "role":   user.role,
            })

        if analysis:
            base.update({
                "strengths":       analysis.get("strengths", []),
                "weaknesses":      analysis.get("weaknesses", []),
                "suggestions":     analysis.get("suggestions", []),
                "score_breakdown": analysis.get("score_breakdown", {}),
                "probabilities":   analysis.get("probabilities", {}),
                "performance_score":     analysis.get("performance_score", perf_score),
                "predicted_performance": analysis.get("performance_score", perf_score),
                "risk_percentage":       analysis.get("risk_percentage", self.risk_percentage),
            })

        return base

    def _compute_performance_score(self) -> float:
        raw = (
            (self.attendance or 0)       * 0.30
            + min((self.study_hours or 0) * 1.5, 25.0)
            + (self.test_score or 0)      * 0.30
            + min((self.assignment_score or 0) * 0.15, 15.0)
        )
        return round(min(100.0, max(0.0, raw)), 2)

    def __repr__(self):
        return (
            f"<StudentPerformance id={self.id} student_id={self.student_id} "
            f"username={self.username!r} result={self.prediction_result!r}>"
        )
