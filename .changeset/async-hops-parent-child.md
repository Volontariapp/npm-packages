---
'@volontariapp/database': minor
'@volontariapp/outbox': patch
---

Trace async hops as a chain instead of siblings of the original request. `continueTraceparent` returns the active span when it belongs to the trace of the message, so the outbox pushers parent the stream message or job on the `outbox` span, and `EventQueueEntity.createFollowUp` parents the follow-up event on the post-processor span. A batch post-processor keeps the previous behaviour (its root span lives in another trace), so a message never leaves the trace of its request.
