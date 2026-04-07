# @volontariapp/crypto

A robust, production-ready cryptographic library for Node.js, providing wrappers for common security operations like symmetric/asymmetric encryption, hashing, and token generation.

Built with strict TypeScript type safety and integrated with `@volontariapp/errors` for consistent error handling across the Volontariapp ecosystem.

## Features

- **Symmetric Encryption**: AES-256-GCM with both probabilistic (nonce) and deterministic IV derivation.
- **Asymmetric Encryption**: RSA encryption/decryption using PKCS#1 OAEP padding.
- **Digital Signatures**: RSA-SHA256 data signing and verification.
- **Hashing**: standard SHA-256 and HMAC calculations.
- **Password Hashing**: Secure password storage using `scrypt`.
- **Key Derivation**: Simple SHA-256 based key derivation for consistent 32-byte keys.
- **Token Utils**: Base64 URL-safe token generation and timing-safe comparison.

## Installation

```bash
yarn add @volontariapp/crypto
```

## Structure

The library is organized into specialized modules:

- `symmetric/`: Handles AES encryption and key derivation.
- `asymmetric/`: Handles RSA encryption and digital signatures.
- `hashing/`: Standard SHA/HMAC and password hashing.
- `utils/`: Token generation and safe comparison.

## Usage

### Symmetric Encryption

```typescript
import { encrypt, decrypt, encryptDeterministic } from '@volontariapp/crypto';

const secret = 'your-32-byte-secret-or-password';
const plaintext = 'Hello, World!';

// Standard encryption (Random IV every time)
const encrypted = encrypt(plaintext, secret);
const decrypted = decrypt(encrypted, secret);

// Deterministic encryption (Same IV for same plaintext/key)
const deterministic = encryptDeterministic(plaintext, secret);
```

### Asymmetric Encryption & Signatures

```typescript
import { encryptAsymmetric, decryptAsymmetric, signData, verifySignature } from '@volontariapp/crypto';

// Encrypt data with a public key
const encrypted = encryptAsymmetric('secret message', publicKey);

// Decrypt data with a private key (can include passphrase)
const decrypted = decryptAsymmetric(encrypted, { key: privateKey, passphrase: '...' });

// Sign data
const signature = signData('important message', privateKey);

// Verify signature
const isValid = verifySignature('important message', signature, publicKey);
```

### Hashing & Passwords

```typescript
import { calculateHash, calculateHmac, hashPassword, verifyPassword } from '@volontariapp/crypto';

// Standard Hash
const hash = calculateHash('some-data');

// Password Hashing (Scrypt)
const pwdHash = hashPassword('my-strong-password');
const isCorrect = verifyPassword('my-strong-password', pwdHash);
```

### Tokens and Safety

```typescript
import { generateToken, safeCompare } from '@volontariapp/crypto';

const token = generateToken(32); // Returns URL-safe base64
const match = safeCompare(userInput, token); // Timing-safe comparison
```

## Error Handling

All functions in this library throw instances of `InternalServerError` or `BadRequestError` from `@volontariapp/errors`. These errors include specific codes like `ENCRYPTION_ERROR`, `SIGN_ERROR`, etc., to allow for programmatic handling.

```typescript
try {
  decrypt(wrongData, key);
} catch (error) {
  if (error.code === 'DECRYPTION_ERROR') {
    // Handle decryption failure
  }
}
```

## License

UNLICENSED
