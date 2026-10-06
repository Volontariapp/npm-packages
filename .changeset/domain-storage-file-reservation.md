---
'@volontariapp/domain-storage': minor
---

Add the shared attachment validation rule (`classifyFileForAttachment`) and `PostgresFileRepository.reserve`, the synchronous all-or-nothing reservation of `ConfirmFileAttachment`, with the `FileAttachmentRefusedException` and `TooManyFilesException` domain errors.
