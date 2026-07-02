# @volontariapp/errors-nest

## Overview
Ce package est une extension de `@volontariapp/errors`, spécifiquement couplée à l'écosystème **NestJS**.

## Key Features
- **Exception Filters** : Filtres globaux NestJS capables d'attraper une `DomainError` et de la transformer de manière standardisée en réponse HTTP appropriée (ex: 400 Bad Request, 404 Not Found).
- **Decorators** : Utilitaires pour faciliter la manipulation des erreurs au sein des classes et contrôleurs NestJS.
