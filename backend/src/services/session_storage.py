"""Session storage abstraction with Redis and in-memory backends.

Provides a unified interface for session management that works across
multiple uvicorn workers in production (Redis) while maintaining
backward compatibility for single-worker development (in-memory).
"""

import os
import json
import logging
import secrets
import threading
from abc import ABC, abstractmethod
from datetime import datetime, timedelta
from typing import Optional, NamedTuple

logger = logging.getLogger(__name__)

# Configuration
SESSION_TTL_HOURS = int(os.getenv("SESSION_TTL_HOURS", "24"))
SESSION_TTL_SECONDS = SESSION_TTL_HOURS * 3600


class SessionData(NamedTuple):
    """Session data with expiration tracking."""
    email: str
    created_at: datetime
    last_accessed: datetime


class SessionStorageBackend(ABC):
    """Abstract base class for session storage backends."""

    @abstractmethod
    def create(self, token: str, session: SessionData, ttl_seconds: int) -> bool:
        """Store a new session. Returns True on success."""
        pass

    @abstractmethod
    def get(self, token: str) -> Optional[SessionData]:
        """Get session data, returning None if not found or expired."""
        pass

    @abstractmethod
    def update_access_time(self, token: str, ttl_seconds: int) -> bool:
        """Update last_accessed time and reset TTL. Returns True on success."""
        pass

    @abstractmethod
    def delete(self, token: str) -> Optional[str]:
        """Delete a session, returning the email if found."""
        pass

    @abstractmethod
    def delete_by_email(self, email: str) -> int:
        """Delete all sessions for a user, returning count removed."""
        pass

    @abstractmethod
    def cleanup_expired(self) -> int:
        """Remove expired sessions, returning count removed."""
        pass


class InMemorySessionStorage(SessionStorageBackend):
    """Thread-safe in-memory session storage (single-worker fallback).

    Suitable for development and single-worker deployments.
    Sessions are lost on application restart.
    """

    def __init__(self, ttl_hours: int = SESSION_TTL_HOURS):
        self._sessions: dict[str, SessionData] = {}
        self._lock = threading.Lock()
        self._ttl_hours = ttl_hours

    def create(self, token: str, session: SessionData, ttl_seconds: int) -> bool:
        with self._lock:
            self._sessions[token] = session
        return True

    def get(self, token: str) -> Optional[SessionData]:
        with self._lock:
            session = self._sessions.get(token)
            if not session:
                return None

            # Check expiration
            now = datetime.utcnow()
            if now - session.last_accessed > timedelta(hours=self._ttl_hours):
                self._sessions.pop(token, None)
                return None

            return session

    def update_access_time(self, token: str, ttl_seconds: int) -> bool:
        with self._lock:
            session = self._sessions.get(token)
            if not session:
                return False

            self._sessions[token] = SessionData(
                email=session.email,
                created_at=session.created_at,
                last_accessed=datetime.utcnow()
            )
            return True

    def delete(self, token: str) -> Optional[str]:
        with self._lock:
            session = self._sessions.pop(token, None)
            return session.email if session else None

    def delete_by_email(self, email: str) -> int:
        with self._lock:
            tokens_to_remove = [t for t, s in self._sessions.items() if s.email == email]
            for token in tokens_to_remove:
                self._sessions.pop(token, None)
            return len(tokens_to_remove)

    def cleanup_expired(self) -> int:
        now = datetime.utcnow()
        with self._lock:
            expired = [
                t for t, s in self._sessions.items()
                if now - s.last_accessed > timedelta(hours=self._ttl_hours)
            ]
            for token in expired:
                self._sessions.pop(token, None)
            return len(expired)


class RedisSessionStorage(SessionStorageBackend):
    """Redis-based session storage for multi-worker deployments.

    Uses Redis native TTL for automatic session expiration.
    Supports bulk invalidation via email-to-tokens mapping.
    """

    # Redis key prefixes
    TOKEN_PREFIX = "session:token:"      # session:token:<token> -> JSON session data
    EMAIL_PREFIX = "session:email:"      # session:email:<email> -> SET of tokens

    def __init__(self, redis_url: str, ttl_hours: int = SESSION_TTL_HOURS):
        import redis
        self._redis = redis.from_url(
            redis_url,
            decode_responses=True,
            socket_connect_timeout=5,
            socket_timeout=5,
            retry_on_timeout=True,
        )
        self._ttl_hours = ttl_hours
        self._ttl_seconds = ttl_hours * 3600

    def _session_to_json(self, session: SessionData) -> str:
        return json.dumps({
            "email": session.email,
            "created_at": session.created_at.isoformat(),
            "last_accessed": session.last_accessed.isoformat(),
        })

    def _json_to_session(self, data: str) -> SessionData:
        parsed = json.loads(data)
        return SessionData(
            email=parsed["email"],
            created_at=datetime.fromisoformat(parsed["created_at"]),
            last_accessed=datetime.fromisoformat(parsed["last_accessed"]),
        )

    def create(self, token: str, session: SessionData, ttl_seconds: int) -> bool:
        try:
            pipe = self._redis.pipeline()
            # Store session data with TTL
            token_key = f"{self.TOKEN_PREFIX}{token}"
            pipe.setex(token_key, ttl_seconds, self._session_to_json(session))
            # Add token to user's token set (for bulk invalidation)
            email_key = f"{self.EMAIL_PREFIX}{session.email}"
            pipe.sadd(email_key, token)
            pipe.expire(email_key, ttl_seconds + 3600)  # Extra hour buffer
            pipe.execute()
            return True
        except Exception as e:
            logger.error(f"Redis create session error: {e}")
            return False

    def get(self, token: str) -> Optional[SessionData]:
        try:
            token_key = f"{self.TOKEN_PREFIX}{token}"
            data = self._redis.get(token_key)
            if not data:
                return None
            return self._json_to_session(data)
        except Exception as e:
            logger.error(f"Redis get session error: {e}")
            return None

    def update_access_time(self, token: str, ttl_seconds: int) -> bool:
        try:
            token_key = f"{self.TOKEN_PREFIX}{token}"
            data = self._redis.get(token_key)
            if not data:
                return False

            session = self._json_to_session(data)
            updated = SessionData(
                email=session.email,
                created_at=session.created_at,
                last_accessed=datetime.utcnow(),
            )
            # Update and reset TTL
            self._redis.setex(token_key, ttl_seconds, self._session_to_json(updated))
            return True
        except Exception as e:
            logger.error(f"Redis update access time error: {e}")
            return False

    def delete(self, token: str) -> Optional[str]:
        try:
            token_key = f"{self.TOKEN_PREFIX}{token}"
            data = self._redis.get(token_key)
            if not data:
                return None

            session = self._json_to_session(data)
            pipe = self._redis.pipeline()
            pipe.delete(token_key)
            pipe.srem(f"{self.EMAIL_PREFIX}{session.email}", token)
            pipe.execute()
            return session.email
        except Exception as e:
            logger.error(f"Redis delete session error: {e}")
            return None

    def delete_by_email(self, email: str) -> int:
        try:
            email_key = f"{self.EMAIL_PREFIX}{email}"
            tokens = self._redis.smembers(email_key)
            if not tokens:
                return 0

            pipe = self._redis.pipeline()
            for token in tokens:
                pipe.delete(f"{self.TOKEN_PREFIX}{token}")
            pipe.delete(email_key)
            pipe.execute()
            return len(tokens)
        except Exception as e:
            logger.error(f"Redis delete by email error: {e}")
            return 0

    def cleanup_expired(self) -> int:
        # Redis handles TTL expiration automatically
        # This method exists for interface compatibility
        return 0

    def health_check(self) -> bool:
        """Check if Redis is reachable."""
        try:
            self._redis.ping()
            return True
        except Exception:
            return False


def get_session_storage() -> SessionStorageBackend:
    """Factory function to get the appropriate session storage backend.

    Uses Redis if REDIS_URL is set and reachable, falls back to in-memory.
    """
    redis_url = os.getenv("REDIS_URL")
    ttl_hours = SESSION_TTL_HOURS

    if redis_url:
        try:
            storage = RedisSessionStorage(redis_url, ttl_hours)
            if storage.health_check():
                # Mask password in logs
                safe_url = redis_url.split("@")[-1] if "@" in redis_url else redis_url
                logger.info(f"Using Redis session storage: {safe_url}")
                return storage
            else:
                logger.warning("Redis not reachable, falling back to in-memory storage")
        except Exception as e:
            logger.warning(f"Failed to initialize Redis: {e}, falling back to in-memory storage")

    logger.info("Using in-memory session storage (single-worker mode)")
    return InMemorySessionStorage(ttl_hours)


# Singleton instance - initialized on first access
_storage: Optional[SessionStorageBackend] = None
_storage_lock = threading.Lock()


def get_storage() -> SessionStorageBackend:
    """Get the singleton session storage instance.

    Thread-safe lazy initialization.
    """
    global _storage
    if _storage is None:
        with _storage_lock:
            if _storage is None:
                _storage = get_session_storage()
    return _storage


def create_session(email: str) -> str:
    """Create a new session for the given email.

    Returns the session token.
    """
    token = secrets.token_urlsafe(32)
    now = datetime.utcnow()
    session = SessionData(
        email=email,
        created_at=now,
        last_accessed=now
    )
    storage = get_storage()
    storage.create(token, session, SESSION_TTL_SECONDS)
    return token


def get_session(token: str) -> Optional[SessionData]:
    """Get session data if valid, updating last accessed time.

    Returns None if token not found or expired.
    """
    if not token:
        return None
    storage = get_storage()
    session = storage.get(token)
    if session:
        # Update last accessed time (extends TTL in Redis)
        storage.update_access_time(token, SESSION_TTL_SECONDS)
    return session


def invalidate_session(token: str) -> Optional[str]:
    """Invalidate a session, returning the email if found."""
    storage = get_storage()
    return storage.delete(token)


def invalidate_user_sessions(email: str) -> int:
    """Invalidate all sessions for a user, returning count removed."""
    storage = get_storage()
    return storage.delete_by_email(email)


def cleanup_expired_sessions() -> int:
    """Remove all expired sessions, returning count removed."""
    storage = get_storage()
    return storage.cleanup_expired()
