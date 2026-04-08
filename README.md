# 📦 Volontariapp - NPM Packages Monorepo

[![L libraries](https://img.shields.io/badge/monorepo-libraries-blue.svg)](https://github.com/Volontariapp)
[![TypeScript](https://img.shields.io/badge/language-TypeScript-blue.svg)](https://www.typescriptlang.org/)
[![GitNexus](https://img.shields.io/badge/intelligence-GitNexus-orange.svg)](https://gitnexus.vercel.app/)

This monorepo contains the shared libraries, types, and tools used across all Volontariapp microservices and clients.

---

## 🧠 Code Intelligence with GitNexus

This project uses **GitNexus** to map the relationships between shared libraries and detect the impact of changes across the entire package ecosystem.

### 🚀 Visualization
To see the codebase graph:
1. Run `npx gitnexus serve`
2. Visit [https://gitnexus.vercel.app/](https://gitnexus.vercel.app/)

---

## 🛠️ Included Packages

- `@volontariapp/auth`: Shared authentication and gRPC interceptors.
- `@volontariapp/contracts`: Generated gRPC TypeScript types.
- `@volontariapp/errors`: Centralized error handling for microservices.
- `@volontariapp/errors-nest`: NestJS specific error filters and decorators.
- `@volontariapp/utils`: Common utility functions.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Yarn (v3+)

### Installation
```bash
yarn install
```

### Building Packages
```bash
# Build all packages
yarn build
```

---

## 📜 License
This project is [MIT licensed](LICENSE).
