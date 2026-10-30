# Changelog

## 4.8.3

### Patch Changes

- Auto-generated proto typings update for both pure contracts and NestJS integration.

## 4.8.2

### Patch Changes

- Export the ranking folder from the package index so that the ranking messages, enums and service names are importable from the package root.

## 4.8.1

### Patch Changes

- Auto-generated proto typings update for both pure contracts and NestJS integration.

## 4.8.0

### Minor Changes

- contracts: add `CoverStatusWeb` and `coverUrl` to the gateway `EventDTO`. `coverStatus` is now the status name (`NONE`, `PENDING`, `READY`, `REJECTED`) and `coverUrl` is absent until the cover is READY.

## 4.7.0

### Minor Changes

- Add media (PostMediaWeb) and mediaStatus (PostMediaStatusWeb) to PostWeb. The api-gateway computes media[].url from fileId and omits it until mediaStatus is READY.

## 4.6.0

### Minor Changes

- Add the optional avatarUrl field to UserWeb and UserPublicWeb. The api-gateway computes it from avatarFileId, so clients can read the avatar URL from the typed profile responses instead of declaring a local type.

## 4.5.0

### Minor Changes

- Export the storage module from the package root so that the front-end can import the EntityType, FileStatus, ScanStatus, ValidationMode and RejectionReason enums used by the gateway storage requests and responses.

## 4.4.0

### Minor Changes

- Add the gateway storage module types (GenerateUploadUrlRequest, ConfirmUploadRequest, GetFileMetadataRequest, FileMetadataDTO and the web responses) shared between api-gateway and the front-end.

## 4.3.16

### Patch Changes

- Updated dependencies []:
  - @volontariapp/logger@0.4.0

## 4.3.15

### Patch Changes

- Updated dependencies []:
  - @volontariapp/logger@0.3.1

## 4.3.14

### Patch Changes

- Updated dependencies []:
  - @volontariapp/logger@0.3.0

## 4.3.13

### Patch Changes

- Auto-generated proto typings update for both pure contracts and NestJS integration.

## 4.3.12

### Patch Changes

- Auto-generated proto typings update for both pure contracts and NestJS integration.

## 4.3.11

### Patch Changes

- Auto-generated proto typings update for both pure contracts and NestJS integration.

## 4.3.10

### Patch Changes

- Auto-generated proto typings update for both pure contracts and NestJS integration.

## 4.3.9

### Patch Changes

- Auto-generated proto typings update for both pure contracts and NestJS integration.

## 4.3.8

### Patch Changes

- Auto-generated proto typings update for both pure contracts and NestJS integration.

## 4.3.7

### Patch Changes

- Auto-generated proto typings update for both pure contracts and NestJS integration.

## 4.3.6

### Patch Changes

- new follow event

## 4.3.5

### Patch Changes

- Auto-generated proto typings update for both pure contracts and NestJS integration.

## 4.3.4

### Patch Changes

- Auto-generated proto typings update for both pure contracts and NestJS integration.

## 4.3.3

### Patch Changes

- README bump

- Updated dependencies []:
  - @volontariapp/logger@0.2.7

## 4.3.2

### Patch Changes

- README bump

- Updated dependencies []:
  - @volontariapp/logger@0.2.6

## 4.3.1

### Patch Changes

- Auto-generated proto typings update for both pure contracts and NestJS integration.

## 4.3.0

### Minor Changes

- added PublicUserWebResponse on package

## 4.2.8

### Patch Changes

- Auto-generated proto typings update for both pure contracts and NestJS integration.

## 4.2.7

### Patch Changes

- Auto-generated proto typings update for both pure contracts and NestJS integration.

## 4.2.6

### Patch Changes

- Auto-generated proto typings update for both pure contracts and NestJS integration.

## 4.2.5

### Patch Changes

- new api contract missing type + event post

## 4.2.4

### Patch Changes

- Auto-generated proto typings update for both pure contracts and NestJS integration.

## 4.2.3

### Patch Changes

- [`44e7a08`](https://github.com/Volontariapp/npm-packages/commit/44e7a0874947115ea18c2274c7f76d52df560ced) Thanks [@VictorAgahi](https://github.com/VictorAgahi)! - change date post

## 4.2.2

### Patch Changes

- rename: comment request

## 4.2.1

### Patch Changes

- fix: add comment request

## 4.2.0

### Minor Changes

- feat: add comments schemas and pagination to posts

## 4.1.1

### Patch Changes

- Auto-generated proto typings update for both pure contracts and NestJS integration.

## 4.1.0

### Minor Changes

- added GetPostRequest in post contract library

## 4.0.14

### Patch Changes

- Auto-generated proto typings update for both pure contracts and NestJS integration.

## 4.0.13

### Patch Changes

- Auto-generated proto typings update for both pure contracts and NestJS integration.

## 4.0.12

### Patch Changes

- Auto-generated proto typings update for both pure contracts and NestJS integration.

## 4.0.11

### Patch Changes

- license package

- Updated dependencies []:
  - @volontariapp/logger@0.2.5

## 4.0.10

### Patch Changes

- Updated dependencies []:
  - @volontariapp/logger@0.2.4

## 4.0.9

### Patch Changes

- Auto-generated proto typings update for both pure contracts and NestJS integration.

## 4.0.8

### Patch Changes

- Auto-generated proto typings update for both pure contracts and NestJS integration.

## 4.0.7

### Patch Changes

- patch new contract user

## 4.0.6

### Patch Changes

- patch new contract

## 4.0.5

### Patch Changes

- Auto-generated proto typings update for both pure contracts and NestJS integration.

## 4.0.4

### Patch Changes

- Auto-generated proto typings update for both pure contracts and NestJS integration.

## 4.0.3

### Patch Changes

- Auto-generated proto typings update for both pure contracts and NestJS integration.

## 4.0.2

### Patch Changes

- Auto-generated proto typings update for both pure contracts and NestJS integration.

## 4.0.1

### Patch Changes

- merging coverage

## 4.0.0

### Patch Changes

- Contract social added

## 3.3.4

### Patch Changes

- Updated dependencies []:
  - @volontariapp/logger@0.2.3

## 3.3.3

### Patch Changes

- Auto-generated proto typings update for both pure contracts and NestJS integration.

## 3.3.2

### Patch Changes

- Auto-generated proto typings update for both pure contracts and NestJS integration.

## 3.3.1

### Patch Changes

- add requirement request on contract

## 3.3.0

### Minor Changes

- date for request & response

## 3.2.2

### Patch Changes

- fix: index.ts deps

## 3.2.1

### Patch Changes

- This PR performs a full regeneration of all proto files and TypeScript types for both pure @volontariapp/contracts and NestJS @volontariapp/contracts-nest packages.

## 3.2.0

### Minor Changes

- patch version

## 3.1.5

### Patch Changes

- This PR performs a full regeneration of all proto files and TypeScript types for both pure @volontariapp/contracts and NestJS @volontariapp/contracts-nest packages.

## 3.1.4

### Patch Changes

- Add missing event request interfaces

## 3.1.3

### Patch Changes

- bump global version

- Updated dependencies []:
  - @volontariapp/logger@0.2.2

## 3.1.2

### Patch Changes

- bump ci

- Updated dependencies []:
  - @volontariapp/logger@0.2.1

## 3.1.1

### Patch Changes

- refacto contract libs

## 3.1.0

### Minor Changes

- refacto contract for gateway compatibility

## 3.0.10

### Patch Changes

- Auto-generated proto typings update for both pure contracts and NestJS integration.

## 3.0.9

### Patch Changes

- Bump contract-nest packages

## 3.0.8

### Patch Changes

- This PR performs a full regeneration of all proto files and TypeScript types for both pure @volontariapp/contracts and NestJS @volontariapp/contracts-nest packages.

## 3.0.7

### Patch Changes

- Auto-generated proto typings update for both pure contracts and NestJS integration.

## 3.0.6

### Patch Changes

- Auto-generated proto typings update for both pure contracts and NestJS integration.

## 3.0.5

### Patch Changes

- Auto-generated proto typings update for both pure contracts and NestJS integration.

## 3.0.4

### Patch Changes

- This PR performs a full regeneration of all proto files and TypeScript types for both pure @volontariapp/contracts and NestJS @volontariapp/contracts-nest packages.

## 3.0.3

### Patch Changes

- Auto-generated proto typings update for both pure contracts and NestJS integration.

## 3.0.2

### Patch Changes

- This PR performs a full regeneration of all proto files and TypeScript types for both pure @volontariapp/contracts and NestJS @volontariapp/contracts-nest packages.

## 3.0.1

### Patch Changes

- This PR performs a full regeneration of all proto files and TypeScript types for both pure @volontariapp/contracts and NestJS @volontariapp/contracts-nest packages.

## 3.0.0

### Major Changes

- BREAKING CHANGES: split libs contracts

## 2.2.0

### Minor Changes

- logger added

## 2.1.1

### Patch Changes

- update version for exposing dist

## 2.1.0

### Minor Changes

- update version for exposing proto

## 2.0.2

### Patch Changes

- Cleaning triggers

## 2.0.1

### Patch Changes

- New CI tests and trigger

## 2.0.0

### Major Changes

- CI done, so major release to flush previous trash versions
