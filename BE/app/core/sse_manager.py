import asyncio
from typing import Any, Dict, Set


class SSEManager:
    """In-process registry of open notification streams, one asyncio.Queue per browser tab.

    Single-process only: with several workers/instances a push made in one process cannot
    reach a queue living in another (swap the internals for Redis Pub/Sub if that happens)."""

    def __init__(self) -> None:
        self._user_queues: Dict[str, Set[asyncio.Queue]] = {}
        self._admin_queues: Set[asyncio.Queue] = set()

    def subscribe(self, user_id: str, is_admin: bool) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue(maxsize=50)
        self._user_queues.setdefault(user_id, set()).add(q)
        if is_admin:
            self._admin_queues.add(q)
        return q

    def unsubscribe(self, user_id: str, q: asyncio.Queue) -> None:
        queues = self._user_queues.get(user_id)
        if queues is not None:
            queues.discard(q)
            if not queues:
                del self._user_queues[user_id]
        self._admin_queues.discard(q)

    def _offer(self, q: asyncio.Queue, event: Dict[str, Any]) -> None:
        try:
            q.put_nowait(event)
        except asyncio.QueueFull:
            pass  # a stuck tab must never block or fail the caller; it resyncs on reconnect

    def push_to_user(self, user_id: str, event: Dict[str, Any]) -> None:
        for q in list(self._user_queues.get(user_id, ())):
            self._offer(q, event)

    def push_to_admins(self, event: Dict[str, Any]) -> None:
        for q in list(self._admin_queues):
            self._offer(q, event)


sse_manager = SSEManager()
