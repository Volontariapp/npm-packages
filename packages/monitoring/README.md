# @volontariapp/monitoring

## Overview
Package en charge de l'observabilité et du monitoring du cluster de services de Volontariapp.

## Key Features
- **OpenTelemetry API** : Implémentation du traçage distribué (Distributed Tracing), permettant de propager et de tracer les requêtes (ex: `X-Correlation-ID`) à travers l'API Gateway, gRPC, et les Workers.

## Configuration de `initTracing`

| Réglage | Option | Variable d'environnement | Défaut |
| :--- | :--- | :--- | :--- |
| Ratio de traces racines conservées (0 à 1) | `sampleRatio` | `OTEL_TRACES_SAMPLER_ARG` | `1` (tout garder) |
| Environnement (`deployment.environment`) | `environment` | `DD_ENV` | attribut absent |
| URL de l'exporteur OTLP | `exporterUrl` | `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://localhost:4317` |

- **Échantillonnage** : `ParentBased(TraceIdRatioBased)`. Le ratio ne s'applique qu'aux traces racines ; une trace dont le parent est échantillonné (ou non) suit la décision du parent, y compris à travers les jobs et événements asynchrones. Une valeur qui n'est pas un nombre entre 0 et 1 retombe sur `1` avec un avertissement. Le défaut `1` conserve le comportement historique : il reste à fixer avec les quotas Datadog (ticket 0.4, quotas pas encore documentés).
- **Environnement** : jamais déduit de `NODE_ENV`, pour ne pas étiqueter à tort un environnement. Sans `DD_ENV` ni option, l'attribut est omis.
- **Arrêt** : sur SIGTERM, le SDK est vidé (`sdk.shutdown()`) sans `process.exit`. Si un autre gestionnaire SIGTERM existe au moment du signal (NestJS `enableShutdownHooks`), il termine le processus ; sinon le signal est renvoyé après le vidage pour que le processus s'arrête (Node ne s'arrête plus de lui-même dès qu'un listener SIGTERM existe). Une application NestJS doit appeler `app.enableShutdownHooks()` pour que ses requêtes en cours se terminent avant l'arrêt.
