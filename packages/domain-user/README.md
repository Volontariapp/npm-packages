# @volontariapp/domain-user

## Overview & Domain Driven Design (DDD)

Le package `domain-user` représente le **Cœur du Métier** (Core Domain) pour l'identité, le profil et l'état des **Utilisateurs**.
Totalement découplé de l'infrastructure d'authentification (ex: Firebase, OAuth) ou de la base de données (PostgreSQL), il définit ce qu'est un Utilisateur valide au sein de Volontariapp.

Il est utilisé (DRY) par :
- `ms-user`
- Les Workers de modération ou de désactivation de comptes
- Les autres services nécessitant de valider des statuts utilisateurs

## Architecture du Domaine

```mermaid
graph TD
    subgraph "Domain Layer (Core)"
        US[UserDomainService]
        UE[UserEntity]
        EM[EmailValueObject]
        PH[PhoneValueObject]
        
        US -->|Valide via| UE
        UE -->|Propriété structurée| EM
        UE -->|Propriété structurée| PH
    end
    
    subgraph "Infrastructure Layer"
        PG[PostgresUserRepository]
        RPC[UserGrpcController]
        
        RPC -->|Appelle| US
        US -->|Persiste (Interface)| PG
    end
```

## Structure des Dossiers

```text
src/
├── entities/           # UserEntity, UserProfileEntity
├── value-objects/      # Email, PhoneNumber, Username (règles de regex/longueur)
├── services/           # UserRegistrationService, AccountSuspensionService
├── repositories/       # IUserProfileRepository
└── test/               # Factories de test (ex: buildUserEntity)
```

## Exemples d'Implémentation

### Value Object d'Email strict

```typescript
// value-objects/email.value-object.ts
export class Email {
  private readonly address: string;

  constructor(address: string) {
    if (!this.isValidEmail(address)) {
      throw new DomainError('INVALID_EMAIL', `The email ${address} is not valid.`);
    }
    this.address = address.toLowerCase();
  }

  public getValue(): string {
    return this.address;
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}
```
