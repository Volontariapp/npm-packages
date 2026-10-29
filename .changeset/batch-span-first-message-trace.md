---
'@volontariapp/database': patch
---

Keep the work done by a batch post-processor in the trace of its first message. The `batch` span created by `runBatchInTraceContext` is now a child of the first message span instead of a root in a trace of its own, so follow-up events (`createFollowUp`) and jobs written inside the handler chain under the step that emits them. The other messages of the batch keep their own span and a link to the batch span.
