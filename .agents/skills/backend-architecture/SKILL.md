---
name: Backend Architecture
description: Overview of the API Gateway, gRPC communication, and Auth/Internal tokens.
---

# Backend Architecture

## API Gateway
- The API Gateway is the single entry point for all requests.
- It is responsible for verifying authentication via an `access token` or `refresh token`.
- Once authenticated, an **Interceptor** intercepts the request and generates an **INTERNAL TOKEN**.

## Microservices (MS)
- Microservices communicate with the API Gateway via **gRPC**.
- They use the **INTERNAL TOKEN** for authorization and identity propagation.
- Microservices are exposed as NPM packages.

## Key Rules
- NEVER bypass the API Gateway for external requests.
- Always expect an `INTERNAL TOKEN` when developing gRPC endpoints in the microservices.
