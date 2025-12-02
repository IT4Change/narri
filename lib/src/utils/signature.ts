/**
 * JWS (JSON Web Signature) utilities for signing and verifying actions
 * Uses Ed25519 signatures via Web Crypto API
 *
 * JWS Compact Serialization Format (RFC 7515):
 * BASE64URL(UTF8(JWS Protected Header)) || '.' ||
 * BASE64URL(JWS Payload) || '.' ||
 * BASE64URL(JWS Signature)
 */

import { base64Decode } from './did';

/**
 * JWS Header for Ed25519 signatures
 */
interface JwsHeader {
  alg: 'EdDSA';  // Ed25519 algorithm identifier
  typ: 'JWT';
}

/**
 * Convert Uint8Array to base64url encoding (RFC 7515)
 */
function base64urlEncode(data: Uint8Array): string {
  // Standard base64 encoding
  let base64: string;
  if (typeof btoa !== 'undefined') {
    base64 = btoa(String.fromCharCode(...data));
  } else {
    base64 = Buffer.from(data).toString('base64');
  }

  // Convert to base64url: replace +/= with -/_ and remove padding
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Convert base64url to Uint8Array
 */
function base64urlDecode(base64url: string): Uint8Array {
  // Convert base64url to standard base64
  let base64 = base64url
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  // Add padding
  while (base64.length % 4) {
    base64 += '=';
  }

  // Decode
  if (typeof atob !== 'undefined') {
    const binary = atob(base64);
    return new Uint8Array([...binary].map(c => c.charCodeAt(0)));
  } else {
    return new Uint8Array(Buffer.from(base64, 'base64'));
  }
}

/**
 * Convert Uint8Array to ArrayBuffer (for Web Crypto API compatibility)
 * Creates a clean ArrayBuffer copy that's guaranteed to not be SharedArrayBuffer
 */
function toArrayBuffer(arr: Uint8Array): ArrayBuffer {
  // Create a clean copy with proper ArrayBuffer
  return arr.buffer.slice(arr.byteOffset, arr.byteOffset + arr.byteLength) as ArrayBuffer;
}

/**
 * Import a private key from PKCS#8 format for signing
 */
async function importPrivateKey(privateKeyPkcs8: Uint8Array): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    'pkcs8',
    toArrayBuffer(privateKeyPkcs8),
    {
      name: 'Ed25519',
    },
    false, // not extractable after import
    ['sign']
  );
}

/**
 * Import a public key from raw bytes for verification
 */
async function importPublicKey(publicKeyRaw: Uint8Array): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    'raw',
    toArrayBuffer(publicKeyRaw),
    {
      name: 'Ed25519',
    },
    false,
    ['verify']
  );
}

/**
 * Sign data and return JWS compact serialization
 *
 * @param payload - The data to sign (will be JSON stringified)
 * @param privateKeyBase64 - Base64-encoded PKCS#8 private key
 * @returns JWS compact serialization string (header.payload.signature)
 */
export async function signJws(
  payload: unknown,
  privateKeyBase64: string
): Promise<string> {
  // 1. Create JWS header
  const header: JwsHeader = {
    alg: 'EdDSA',
    typ: 'JWT',
  };

  // 2. Encode header and payload
  const encodedHeader = base64urlEncode(
    new TextEncoder().encode(JSON.stringify(header))
  );
  const encodedPayload = base64urlEncode(
    new TextEncoder().encode(JSON.stringify(payload))
  );

  // 3. Create signing input
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signingInputBytes = new TextEncoder().encode(signingInput);

  // 4. Import private key
  const privateKeyPkcs8 = base64Decode(privateKeyBase64);
  const privateKey = await importPrivateKey(privateKeyPkcs8);

  // 5. Sign with Ed25519
  const signatureBuffer = await crypto.subtle.sign(
    'Ed25519',
    privateKey,
    signingInputBytes
  );
  const signature = new Uint8Array(signatureBuffer);

  // 6. Encode signature
  const encodedSignature = base64urlEncode(signature);

  // 7. Return JWS compact serialization
  return `${signingInput}.${encodedSignature}`;
}

/**
 * Verify a JWS signature
 *
 * @param jws - JWS compact serialization string
 * @param publicKeyBase64 - Base64-encoded raw public key
 * @returns Object with verification result and decoded payload
 */
export async function verifyJws(
  jws: string,
  publicKeyBase64: string
): Promise<{ valid: boolean; payload?: unknown; error?: string }> {
  try {
    // 1. Split JWS into parts
    const parts = jws.split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'Invalid JWS format' };
    }

    const [encodedHeader, encodedPayload, encodedSignature] = parts;

    // 2. Decode header
    const headerBytes = base64urlDecode(encodedHeader);
    const header = JSON.parse(new TextDecoder().decode(headerBytes)) as JwsHeader;

    // 3. Verify algorithm
    if (header.alg !== 'EdDSA') {
      return { valid: false, error: `Unsupported algorithm: ${header.alg}` };
    }

    // 4. Decode payload
    const payloadBytes = base64urlDecode(encodedPayload);
    const payload = JSON.parse(new TextDecoder().decode(payloadBytes));

    // 5. Decode signature
    const signature = base64urlDecode(encodedSignature);

    // 6. Create signing input for verification
    const signingInput = `${encodedHeader}.${encodedPayload}`;
    const signingInputBytes = new TextEncoder().encode(signingInput);

    // 7. Import public key
    const publicKeyRaw = base64Decode(publicKeyBase64);
    const publicKey = await importPublicKey(publicKeyRaw);

    // 8. Verify signature
    const valid = await crypto.subtle.verify(
      'Ed25519',
      publicKey,
      toArrayBuffer(signature),
      signingInputBytes
    );

    return { valid, payload };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Verification failed',
    };
  }
}

/**
 * Extract payload from JWS without verifying signature
 * Useful for debugging or when signature verification happens separately
 */
export function extractJwsPayload(jws: string): unknown | null {
  try {
    const parts = jws.split('.');
    if (parts.length !== 3) return null;

    const payloadBytes = base64urlDecode(parts[1]);
    return JSON.parse(new TextDecoder().decode(payloadBytes));
  } catch {
    return null;
  }
}

/**
 * Sign an entity (Assumption, Vote, Tag, EditEntry) for storage
 *
 * @param entity - The entity to sign (must have id, createdAt, and other relevant fields)
 * @param privateKeyBase64 - Base64-encoded private key
 * @returns JWS signature string
 */
export async function signEntity(
  entity: Record<string, unknown>,
  privateKeyBase64: string
): Promise<string> {
  // Create canonical payload (exclude signature and publicKey fields)
  const { signature, publicKey, ...payload } = entity;

  return await signJws(payload, privateKeyBase64);
}

/**
 * Canonically stringify an object with sorted keys for deterministic comparison
 * Handles nested objects and arrays recursively
 */
function canonicalStringify(obj: unknown): string {
  if (obj === null) return 'null';
  if (obj === undefined) return 'undefined';
  if (typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalStringify).join(',') + ']';
  }

  // Sort object keys for deterministic ordering
  const sortedKeys = Object.keys(obj).sort();
  const pairs = sortedKeys.map(key => {
    const value = (obj as Record<string, unknown>)[key];
    return JSON.stringify(key) + ':' + canonicalStringify(value);
  });

  return '{' + pairs.join(',') + '}';
}

/**
 * Verify an entity signature
 *
 * @param entity - The entity with signature field
 * @param publicKeyBase64 - Base64-encoded public key for verification
 * @returns Verification result
 */
export async function verifyEntitySignature(
  entity: Record<string, unknown>,
  publicKeyBase64: string
): Promise<{ valid: boolean; error?: string }> {
  if (!entity.signature || typeof entity.signature !== 'string') {
    return { valid: false, error: 'No signature found' };
  }

  // Create canonical payload (same as signing)
  const { signature, publicKey, ...payload } = entity;

  const result = await verifyJws(entity.signature, publicKeyBase64);

  if (!result.valid) {
    return { valid: false, error: result.error };
  }

  // Verify payload matches entity data (use canonical stringification)
  const payloadStr = canonicalStringify(payload);
  const decodedPayloadStr = canonicalStringify(result.payload);

  if (payloadStr !== decodedPayloadStr) {
    return { valid: false, error: 'Payload mismatch' };
  }

  return { valid: true };
}
