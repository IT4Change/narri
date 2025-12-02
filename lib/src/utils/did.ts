/**
 * DID (Decentralized Identifier) utilities for did:key method
 * Uses Ed25519 keypairs and multicodec encoding
 *
 * Uses native Web Crypto API (available in all modern browsers as of 2025)
 * - Chrome 113+ (May 2023)
 * - Firefox 130+ (September 2024)
 * - Safari 18.4+ (Q1 2025)
 */

import { base58btc } from 'multiformats/bases/base58';

/**
 * Keypair structure (raw bytes for DID operations)
 */
export interface Keypair {
  publicKey: Uint8Array;   // 32 bytes Ed25519 public key
  privateKey: Uint8Array;  // 32 bytes Ed25519 private key (PKCS#8 format)
}

/**
 * Identity with DID and keypair
 */
export interface DidIdentity {
  did: string;             // did:key:z6Mk...
  publicKey: string;       // Base64-encoded public key
  privateKey: string;      // Base64-encoded private key
  displayName?: string;
}

/**
 * Ed25519 multicodec prefix
 * https://github.com/multiformats/multicodec/blob/master/table.csv
 */
const ED25519_MULTICODEC_PREFIX = new Uint8Array([0xed, 0x01]);

/**
 * Generate a new Ed25519 keypair using Web Crypto API
 */
export async function generateKeypair(): Promise<Keypair> {
  // Generate Ed25519 keypair using native Web Crypto API
  const cryptoKeyPair = await crypto.subtle.generateKey(
    {
      name: 'Ed25519',
    },
    true, // extractable
    ['sign', 'verify']
  );

  // Export public key as raw bytes (32 bytes)
  const publicKeyBuffer = await crypto.subtle.exportKey('raw', cryptoKeyPair.publicKey);
  const publicKey = new Uint8Array(publicKeyBuffer);

  // Export private key as PKCS#8 format (for storage and later import)
  const privateKeyBuffer = await crypto.subtle.exportKey('pkcs8', cryptoKeyPair.privateKey);
  const privateKey = new Uint8Array(privateKeyBuffer);

  return { publicKey, privateKey };
}

/**
 * Derive did:key from Ed25519 public key
 * Format: did:key:z<base58btc-encoded-multicodec-pubkey>
 */
export function deriveDidFromPublicKey(publicKey: Uint8Array): string {
  // Prepend Ed25519 multicodec prefix (0xed01)
  const multicodecPubKey = new Uint8Array([
    ...ED25519_MULTICODEC_PREFIX,
    ...publicKey,
  ]);

  // Encode with base58btc (prefix 'z')
  const encoded = base58btc.encode(multicodecPubKey);

  return `did:key:${encoded}`;
}

/**
 * Extract Ed25519 public key from did:key
 */
export function extractPublicKeyFromDid(did: string): Uint8Array {
  // Validate format
  if (!did.startsWith('did:key:z')) {
    throw new Error(`Invalid did:key format: ${did}`);
  }

  // Remove 'did:key:' prefix
  const encoded = did.slice(8); // 'z6Mk...'

  // Decode base58btc
  const multicodecPubKey = base58btc.decode(encoded);

  // Verify Ed25519 prefix
  if (multicodecPubKey[0] !== 0xed || multicodecPubKey[1] !== 0x01) {
    throw new Error(`Not an Ed25519 did:key: ${did}`);
  }

  // Extract public key (skip 2-byte prefix)
  return multicodecPubKey.slice(2);
}

/**
 * Check if a DID is a fake/legacy DID (from Phase 0)
 * Fake DIDs have format: did:key:1234567890-abc123
 */
export function isFakeDid(did: string): boolean {
  // Real did:key always starts with 'did:key:z' (base58btc prefix)
  if (!did.startsWith('did:key:')) return true;

  // Real did:key has 'z' prefix (base58btc)
  if (!did.startsWith('did:key:z')) return true;

  // Fake DIDs contain '-' (timestamp-random format)
  if (did.includes('-')) return true;

  return false;
}

/**
 * Generate a complete DID identity with keypair
 */
export async function generateDidIdentity(displayName?: string): Promise<DidIdentity> {
  // Generate keypair (async)
  const keypair = await generateKeypair();
  const did = deriveDidFromPublicKey(keypair.publicKey);

  return {
    did,
    publicKey: base64Encode(keypair.publicKey),
    privateKey: base64Encode(keypair.privateKey),
    displayName,
  };
}

/**
 * Base64 encode a Uint8Array
 */
export function base64Encode(data: Uint8Array): string {
  // Browser-compatible base64 encoding
  if (typeof btoa !== 'undefined') {
    return btoa(String.fromCharCode(...data));
  }
  // Node.js fallback
  return Buffer.from(data).toString('base64');
}

/**
 * Base64 decode to Uint8Array
 */
export function base64Decode(base64: string): Uint8Array {
  // Browser-compatible base64 decoding
  if (typeof atob !== 'undefined') {
    const binary = atob(base64);
    return new Uint8Array([...binary].map(c => c.charCodeAt(0)));
  }
  // Node.js fallback
  return new Uint8Array(Buffer.from(base64, 'base64'));
}

/**
 * Validate DID format
 */
export function isValidDid(did: string): boolean {
  try {
    if (isFakeDid(did)) return false;
    extractPublicKeyFromDid(did);
    return true;
  } catch {
    return false;
  }
}
