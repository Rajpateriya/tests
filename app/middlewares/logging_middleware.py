import time
import uuid
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from app.core.logging import logger


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware that attaches a unique X-Request-ID header to each request,
    calculates response time, and emits structured log statements.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        start_time = time.time()

        # Execute downstream request
        response = await call_next(request)

        process_time_ms = round((time.time() - start_time) * 1000, 2)
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Process-Time"] = f"{process_time_ms}ms"

        # Log request summary
        log_message = (
            f"[{request.method}] {request.url.path} "
            f"status={response.status_code} "
            f"duration={process_time_ms}ms "
            f"client={request.client.host if request.client else 'unknown'}"
        )

        if response.status_code >= 500:
            logger.error(log_message, extra={"request_id": request_id})
        elif response.status_code >= 400:
            logger.warning(log_message, extra={"request_id": request_id})
        else:
            logger.info(log_message, extra={"request_id": request_id})

        return response
