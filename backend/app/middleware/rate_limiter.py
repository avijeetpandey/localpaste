import time
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp


class RateLimiterMiddleware(BaseHTTPMiddleware):
    """Redis sliding-window rate limiter."""

    def __init__(self, app: ASGIApp, redis_client=None, anon_limit: int = 60, auth_limit: int = 300):
        super().__init__(app)
        self._redis = redis_client
        self.anon_limit = anon_limit
        self.auth_limit = auth_limit
        self.window = 60  # seconds

    async def dispatch(self, request: Request, call_next):
        if self._redis is None:
            return await call_next(request)

        token = request.headers.get("Authorization", "")
        is_auth = token.startswith("Bearer ")
        limit = self.auth_limit if is_auth else self.anon_limit
        ip = request.client.host if request.client else "unknown"
        key_prefix = "token" if is_auth else "ip"
        identifier = token[7:20] if is_auth else ip
        redis_key = f"rl:{key_prefix}:{identifier}"

        now = int(time.time())
        window_start = now - self.window

        try:
            pipe = self._redis.pipeline()
            await pipe.zremrangebyscore(redis_key, 0, window_start)
            await pipe.zadd(redis_key, {str(now * 1000): now})
            await pipe.zcard(redis_key)
            await pipe.expire(redis_key, self.window + 1)
            results = await pipe.execute()
            count = results[2]
        except Exception:
            return await call_next(request)

        if count > limit:
            return Response(
                content='{"detail":"Rate limit exceeded"}',
                status_code=429,
                media_type="application/json",
                headers={"Retry-After": str(self.window)},
            )

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(max(0, limit - count))
        return response
