---
name: Backend Clean Code & Testing
description: Coding standards, SOLID, Clean Architecture, and Testing conventions.
---

# Clean Code & Testing Standards

## Typing & Structure
- **Strict Typing**: NO `any`, NO `unknown as Type` casting. Types must be strictly inferred or properly defined.
- **Architecture**: Enforce SOLID principles and Clean Architecture.
- **Naming Conventions**: Use `kebab-case` for files and directories.

## Testing Rules
- Tests must be clean and maintainable.
- **Mocks**: Always use the testing library to create mocks. Mocks MUST be in separate files.
- **Factories**: Use factories for test data, and they MUST be in separate files.
- **Spies**: Use `spy` heavily to avoid unbounded mocks and side effects. Always restore/clear spies after tests.
