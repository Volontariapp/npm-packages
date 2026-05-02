# @volontariapp/messaging

Universal messaging contracts and architecture for Volontariapp.

## 🏗 LOB (Local Outbox) Architecture

The **LOB (Local Outbox)** pattern is used to ensure reliable message delivery between microservices while maintaining database consistency. It follows the **Change Data Capture (CDC)** approach.

### 🔄 Data Flow

1.  **Database Change**: A transaction modifies data in a microservice's database (e.g., `ms-event`).
2.  **SQL Trigger**: A native database trigger captures the change and inserts a record into the `event_queue` table.
3.  **Outbox Table**: The `event_queue` (or `jobs_outbox`) table stores the event with its payload (`before`/`after`) and status (`PENDING`).
4.  **Dispatcher**: A background worker polls the outbox table, sends the message to the broker (RabbitMQ/Kafka), and marks the record as `COMPLETED`.

### 📦 Package Structure

This package centralizes all message definitions to ensure type safety across the monorepo.

*   **`events/`**: Definitions for domain events triggered by database changes.
*   **`jobs/`**: Definitions for asynchronous jobs (e.g., sending emails).
*   **`EventRegistry`**: A central TypeScript registry mapping event types to their respective payloads.

## 🛠 Usage

### Event Structure

All domain events follow a standard `EventChangedPayload` structure:

```typescript
export interface EventChangedPayload<T> {
  before: T | null; // State before the change (null on INSERT)
  after: T | null;  // State after the change (null on DELETE)
}
```

### Type Safety

Use the `EventRegistry` to get strict typing when consuming events:

```typescript
import { EventMessagingType, type EventRegistry } from '@volontariapp/messaging';

type RequirementEvent = EventRegistry[EventMessagingType.REQUIREMENT_CHANGED];
// RequirementEvent now has the correct payload structure (before/after ITagPayload)
```

## ➕ Adding a New Event

1.  Define the payload interface in `src/events/[domain]/payloads.ts`.
2.  Add the event type to the `EventMessagingType` enum.
3.  Register the mapping in the `EventRegistry` interface in `src/events/index.ts`.
4.  Implement the SQL trigger in the corresponding microservice to populate the outbox.
