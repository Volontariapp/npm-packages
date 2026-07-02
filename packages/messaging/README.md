# @volontariapp/messaging

Contrats de messagerie universels et architecture asynchrone pour Volontariapp.

## Architecture LOB (Local Outbox)

Le pattern **LOB (Local Outbox)** est utilisé pour garantir la livraison fiable des messages entre les microservices tout en préservant la cohérence de la base de données. Il suit l'approche **Change Data Capture (CDC)**.

### Flux de Données

1. **Modification en Base** : Une transaction modifie des données dans la base de données d'un microservice (ex: `ms-event`).
2. **Trigger SQL** : Un trigger natif en base capture le changement et insère un enregistrement dans la table `event_queue`.
3. **Table Outbox** : La table `event_queue` (ou `jobs_outbox`) stocke l'événement avec sa charge utile (payload `before`/`after`) et son statut (`PENDING`).
4. **Dispatcher** : Un worker en arrière-plan (Outbox Runner) scrute la table outbox, envoie le message au broker (Redis Streams/BullMQ), et marque l'enregistrement comme `COMPLETED`.

### Structure du Package

Ce package centralise toutes les définitions de messages pour garantir la sécurité du typage à travers le monorepo.

* **`events/`** : Définitions des événements métiers déclenchés par des changements en base de données.
* **`jobs/`** : Définitions des tâches asynchrones (ex: envoi d'emails).
* **`EventRegistry`** : Un registre TypeScript centralisé qui mappe les types d'événements à leurs charges utiles respectives.

## Utilisation

### Structure d'un Événement

Tous les événements métiers suivent une structure standard `EventChangedPayload` :

```typescript
export interface EventChangedPayload<T> {
 before: T | null; // État avant le changement (null pour un INSERT)
 after: T | null; // État après le changement (null pour un DELETE)
}
```

### Sécurité du Typage (Type Safety)

Utilisez l'`EventRegistry` pour obtenir un typage strict lors de la consommation des événements :

```typescript
import { EventMessagingType, type EventRegistry } from '@volontariapp/messaging';

type RequirementEvent = EventRegistry[EventMessagingType.REQUIREMENT_CHANGED];
// RequirementEvent possède désormais la bonne structure de payload (before/after ITagPayload)
```

## Ajouter un Nouvel Événement

1. Définissez l'interface du payload dans `src/events/[domain]/payloads.ts`.
2. Ajoutez le type d'événement à l'énumération `EventMessagingType`.
3. Enregistrez le mapping dans l'interface `EventRegistry` dans `src/events/index.ts`.
4. Implémentez le trigger SQL dans le microservice correspondant pour alimenter l'outbox.
