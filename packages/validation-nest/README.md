# @volontariapp/validation-nest

Une librairie de validation ultra-performante pour NestJS, spécialement conçue pour gérer les nuances de la communication gRPC et des Protocol Buffers.

## Pourquoi cette librairie ?

Lors de l'utilisation de NestJS avec gRPC (via `google.protobuf`), plusieurs défis de sérialisation apparaissent que les pipes de validation standards ne gèrent pas nativement :

1.  **Complexité Int64** : Les grands entiers (comme les Timestamps) sont souvent sérialisés sous forme de `string` pour éviter la perte de précision en JavaScript, mais vos DTOs s'attendent peut-être à des `number`.
2.  **Valeurs par défaut Proto3** : Proto3 initialise les chaînes de caractères manquantes par `""`. Cela provoque l'échec des validateurs `@IsOptional()` ou `@IsUUID()` car le champ est techniquement "présent" mais vide.
3.  **Incohérence des Enums** : gRPC envoie souvent les valeurs enum sous forme de chaînes de caractères (ex: `"EVENT_TYPE_SOCIAL"`) tandis que les énumérations TypeScript et la logique s'attendent à l'index numérique (ex: `1`).

## Implémentation

Le `GrpcValidationPipe` étend le `ValidationPipe` standard de NestJS et ajoute une étape de pré-traitement pour normaliser les données avant validation.

### Fonctionnalités Clés

- **Casting automatique Int64/Timestamp** : Convertit automatiquement les champs `seconds` et `nanos` de `string` vers `number`.
- **Normalisation des chaînes vides** : Convertit automatiquement `""` en `undefined`, permettant à `@IsOptional()` de fonctionner correctement.
- **Mapping générique des Enums** : Mappe les clés d'énumérations en chaînes de caractères vers leurs valeurs numériques correspondantes via une carte (map) configurable.
- **Typage Strict** : Construit avec un support TypeScript strict, garantissant qu'aucune précision n'est perdue et que les types sont respectés.
- **Micro-Logger** : Journalisation de débogage intégrée pour tracer les données entrantes et le résultat traité avant que la validation n'atteigne vos contrôleurs.

## Installation

```bash
yarn add @volontariapp/validation-nest
```

## Utilisation

Enregistrez le pipe dans votre `AppModule` ou de manière globale. Utilisez `useFactory` pour fournir vos mappages d'énumérations spécifiques.

```typescript
import { APP_PIPE } from '@nestjs/core';
import { GrpcValidationPipe } from '@volontariapp/validation-nest';
import { EventType, EventState } from '@volontariapp/contracts-nest';

@Module({
  providers: [
    {
      provide: APP_PIPE,
      useFactory: () =>
        new GrpcValidationPipe({
          enumMaps: {
            type: EventType,
            state: EventState,
          },
        }),
    },
  ],
})
export class AppModule {}
```

## Options

`GrpcValidationPipe` accepte toutes les options standards du `ValidationPipeOptions` (NestJS) plus :

- `enumMaps` : Un objet clé-valeur où la clé est le nom de la propriété dans votre DTO et la valeur est l'objet Enum TypeScript.
