# utils/validators.py — Input validation helpers
from config import ActiveConfig


def validate_register_payload(data: dict) -> str | None:
    """
    Validates registration data.
    Returns an error string if invalid, or None if OK.
    """
    username = (data.get("username") or "").strip()
    password = (data.get("password") or "")
    role     = (data.get("role") or "").strip().lower()
    branch   = (data.get("branch") or "").strip()

    if not username:
        return "Username is required."
    if len(username) < 3:
        return "Username must be at least 3 characters."
    if len(username) > 80:
        return "Username must be at most 80 characters."
    if " " in username:
        return "Username must not contain spaces."
    if not password:
        return "Password is required."
    if len(password) < 6:
        return "Password must be at least 6 characters."
    if role not in ActiveConfig.ALLOWED_ROLES:
        return f"Role must be one of: {', '.join(ActiveConfig.ALLOWED_ROLES)}."
    if branch not in ActiveConfig.ALLOWED_BRANCHES:
        return f"Branch must be one of: {', '.join(ActiveConfig.ALLOWED_BRANCHES)}."

    return None
