# Narrative Web of Trust - Architecture & Implementation

**Status**: Implemented (Core Features)
**Date**: December 2025
**Related**: [IDENTITY-CONCEPT.md](./IDENTITY-CONCEPT.md)

---

## Executive Summary

Narrative is a **local-first Web of Trust ecosystem** that enables decentralized identity verification and trust relationships. Built on Automerge CRDTs for offline-first, real-time collaboration without central servers.

**Core Value Proposition:**
- **Decentralized Identity**: Real Ed25519 keypairs with `did:key` format
- **In-Person Verification**: QR code scanning proves physical presence
- **Bidirectional Trust**: Mutual verification creates strong identity bonds
- **Cryptographic Integrity**: JWS signatures prevent forgery
- **Local-First**: Works offline, syncs when connected

---

## Part 1: Architecture Overview

### System Design

```
┌─────────────────────────────────────────────────────────────────┐
│                    Narrative Ecosystem                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│   │  Map App    │  │ Wallet App  │  │ Future Apps │            │
│   │  (Standorte)│  │   (DANK)    │  │    (...)    │            │
│   └──────┬──────┘  └──────┬──────┘  └──────┬──────┘            │
│          │                │                │                    │
│          └────────────────┼────────────────┘                    │
│                           ▼                                     │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │              Shared Library (narrative-ui)              │  │
│   │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │  │
│   │  │   Identity  │ │    Trust    │ │     UI      │       │  │
│   │  │  (did:key)  │ │ (WoT Core)  │ │ Components  │       │  │
│   │  └─────────────┘ └─────────────┘ └─────────────┘       │  │
│   └─────────────────────────────────────────────────────────┘  │
│                           │                                     │
│                           ▼                                     │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │                  Automerge CRDT Layer                   │  │
│   │        (Offline-first, Real-time Sync, P2P)             │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Data Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     User Document (Personal)                    │
│                                                                 │
│  Owner: did:key:z6MkAlice...                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ profile: { displayName, avatarUrl }                      │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │ trustGiven: {                                            │  │
│  │   "did:key:z6MkBob...": TrustAttestation (signed by me)  │  │
│  │ }                                                        │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │ trustReceived: {                                         │  │
│  │   "did:key:z6MkCarol...": TrustAttestation (signed by C) │  │
│  │ }                                                        │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │ vouchers: { ... }  (DANK tokens)                         │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │ workspaces: { ... } (Workspace references)               │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                   Workspace Document (Shared)                   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ identities: { did → IdentityProfile }                    │  │
│  │ identityLookup: { did → { displayName, avatarUrl } }     │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │ App-specific data (markers, assumptions, etc.)           │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Part 2: Identity System

### DID-Key Format

All identities use the `did:key` method with Ed25519 keypairs:

```
did:key:z6MkpTHR8VNsBxYAAWHut2Geadd9jSwuBV8xRoAnwWsdvktH
        └──────────────────────────────────────────────────┘
                    Base58btc-encoded public key
                    with multicodec prefix (0xed01)
```

### Identity Storage

```typescript
// Stored in localStorage as 'narrativeIdentity'
interface StoredIdentity {
  did: string;           // did:key:z6Mk...
  displayName: string;   // User-chosen name
  publicKey: string;     // Base64-encoded Ed25519 public key (32 bytes)
  privateKey: string;    // Base64-encoded PKCS#8 private key
  avatarUrl?: string;    // Data URL or external URL
}
```

### Key Operations

| Operation | Function | Location |
|-----------|----------|----------|
| Generate identity | `generateDidIdentity()` | `lib/src/utils/did.ts` |
| Extract public key from DID | `extractPublicKeyFromDid()` | `lib/src/utils/did.ts` |
| Sign data (JWS) | `signEntity()` | `lib/src/utils/signature.ts` |
| Verify signature | `verifyEntitySignature()` | `lib/src/utils/signature.ts` |

---

## Part 3: Trust Attestation System

### What We Sign

When Alice trusts Bob, she signs:

```typescript
{
  id: "trust-1701234567890-abc123",
  trusterDid: "did:key:z6MkAlice...",   // Who is trusting (Alice)
  trusteeDid: "did:key:z6MkBob...",     // Who is being trusted (Bob)
  level: "verified",                     // Trust level
  verificationMethod: "in-person",       // How verified
  createdAt: 1701234567890,
  updatedAt: 1701234567890,
  trusterUserDocUrl: "automerge:..."     // For bidirectional sync
}
```

**Semantics**: "I (Alice) have personally verified Bob's identity and trust this DID."

### TrustAttestation Schema

```typescript
interface TrustAttestation {
  id: string;
  trusterDid: string;      // Who is trusting
  trusteeDid: string;      // Who is being trusted
  level: 'verified' | 'endorsed';
  verificationMethod?: 'in-person' | 'video-call' | 'email' | 'social-proof';
  notes?: string;          // Optional: "Met at conference 2025"
  createdAt: number;
  updatedAt: number;
  trusterUserDocUrl?: string;  // For bidirectional trust sync
  signature?: string;      // JWS compact serialization
}
```

### Bidirectional Trust Flow

```
     Alice                                      Bob
       │                                         │
       │  1. Alice scans Bob's QR code           │
       │◄────────────────────────────────────────│
       │     QR: narrative://verify/{Bob.did}    │
       │          ?userDoc={Bob.userDocUrl}      │
       │                                         │
       │  2. Alice creates signed attestation    │
       │                                         │
       │  3. Alice writes to her trustGiven      │
       │     Alice.userDoc.trustGiven[Bob] = att │
       │                                         │
       │  4. Alice writes to Bob's trustReceived │
       │─────────────────────────────────────────►
       │     Bob.userDoc.trustReceived[Alice]=att│
       │                                         │
       │  5. Bob sees pending trust request      │
       │                                         │
       │  6. Bob scans Alice's QR to trust back  │
       │◄────────────────────────────────────────│
       │                                         │
       │  7. Now bidirectional: ✓ Gegenseitig    │
       │                                         │
```

### Security Model

**Problem**: Anyone can write to any Automerge document (CRDT characteristic).

**Solution**: Cryptographic signatures verified at read time.

```typescript
// When reading trustReceived:
for (const [trusterDid, attestation] of Object.entries(userDoc.trustReceived)) {
  const publicKey = extractPublicKeyFromDid(attestation.trusterDid);
  const isValid = await verifyEntitySignature(attestation, publicKey);

  if (!isValid) {
    // Ignore or delete forged attestations
    console.warn('Invalid signature, ignoring:', attestation.id);
  }
}
```

### Signature Status

| Status | Icon | Meaning |
|--------|------|---------|
| `valid` | 🛡️ green | Signature verified successfully |
| `invalid` | ⚠️ red | Signature verification failed - possibly forged! |
| `missing` | ❓ gray | No signature (legacy attestation) |
| `pending` | ⏳ spinner | Verification in progress |

---

## Part 4: QR Code Verification

### QR Code Format

```
narrative://verify/{did}?userDoc={userDocUrl}

Example:
narrative://verify/did:key:z6MkpTHR8VNsBxYAAWHut2Geadd9jSwuBV8xRoAnwWsdvktH
  ?userDoc=automerge%3A4NMNnkLhBGpbEzUnaQfYP6fjgLv8
```

### Verification Flow

1. **Display QR**: User shows their QR code (contains DID + userDocUrl)
2. **Scan QR**: Other user scans with camera
3. **Parse URL**: Extract DID and userDocUrl
4. **Create Attestation**: Signed trust attestation created
5. **Bidirectional Write**: Write to both UserDocuments
6. **Reciprocity Prompt**: Scanned user sees prompt to trust back

### Why QR Codes?

- **Proves physical presence**: Must be in same location to scan
- **No central server**: Direct device-to-device information exchange
- **Contains all needed data**: DID for identity, userDocUrl for sync
- **Works offline**: Once scanned, attestation stored locally

---

## Part 5: Implementation Details

### Key Files

| File | Purpose |
|------|---------|
| `lib/src/schema/identity.ts` | `TrustAttestation`, `TrustLevel` types |
| `lib/src/schema/userDocument.ts` | `UserDocument` schema with trust maps |
| `lib/src/hooks/useAppContext.ts` | Trust operations, signature validation |
| `lib/src/components/UserProfileModal.tsx` | Profile with QR code + trust status |
| `lib/src/components/QRScannerModal.tsx` | Camera-based QR scanner |
| `lib/src/components/TrustReciprocityModal.tsx` | Pending trust requests |
| `lib/src/components/CollaboratorsModal.tsx` | "Vertrauensnetzwerk" view |
| `lib/src/components/UserListItem.tsx` | User list with trust badges |
| `lib/src/utils/signature.ts` | JWS signing/verification |
| `lib/src/utils/did.ts` | DID utilities, key extraction |

### Trust Operations

```typescript
// In useAppContext.ts

// Trust a user (after QR scan)
handleTrustUser(trusteeDid: string, trusteeUserDocUrl?: string)

// Revoke trust
handleRevokeTrust(did: string)

// Trust back after receiving trust
handleTrustBack(trusterDid: string)

// Decline pending trust request
handleDeclineTrust(attestationId: string)
```

### UI Components

**Trust Badges on Avatars:**
- 🟢 Checkmark: Bidirectional trust (Gegenseitig)
- 🔵 Arrow right: Outgoing trust only (Du vertraust)
- 🟡 Arrow left: Incoming trust only (Vertraut dir)
- ⚪ None: No trust relationship

**Signature Badges:**
- 🛡️ Shield (green): Valid signature
- ⚠️ Warning (red): Invalid signature
- ❓ Question (gray): Missing signature (legacy)

---

## Part 6: Trust Levels (Current + Future)

### Implemented

| Level | Description | How Achieved |
|-------|-------------|--------------|
| `verified` | Direct trust | QR scan verification |
| `unknown` | No relationship | Default state |

### Future: Transitive Trust

```typescript
type TrustLevel =
  | 'verified'    // Direct: You verified them
  | 'trusted'     // 2nd degree: Friend-of-friend
  | 'endorsed'    // 3rd degree: Friend-of-friend-of-friend
  | 'unknown'     // No trust path
  | 'blocked';    // Explicitly blocked
```

**Algorithm** (not yet implemented):

```typescript
function calculateTrustLevel(
  targetDid: string,
  currentUserDid: string,
  maxDepth: number = 2
): TrustLevel {
  // 1. Check direct trust (trustGiven)
  if (userDoc.trustGiven[targetDid]) return 'verified';

  // 2. BFS through trust graph
  const path = findTrustPath(currentUserDid, targetDid, maxDepth);
  if (path?.length === 2) return 'trusted';   // 1 hop
  if (path?.length === 3) return 'endorsed';  // 2 hops

  return 'unknown';
}
```

---

## Part 7: Apps in the Ecosystem

### Current Apps

| App | Purpose | Trust Integration |
|-----|---------|-------------------|
| **Map App** | Location sharing | Show trusted users' locations |
| **Wallet App** | DANK vouchers | Transfer to trusted users |

### Trust Benefits per App

**Map App:**
- Filter map to show only trusted users
- Different marker colors by trust level
- Trust network visualization on map

**Wallet App:**
- Transfer vouchers to verified friends
- Trust-based transaction limits
- Reputation for voucher issuers

**Future Apps:**
- Assumptions/Voting: Filter votes by trust
- Marketplace: Trust-based ratings
- Messaging: End-to-end encrypted with trusted contacts

---

## Part 8: Comparison with Alternatives

| Approach | Decentralized | Privacy | Sybil-Resistant | Offline-First |
|----------|---------------|---------|-----------------|---------------|
| **Phone/Email Verification** | ❌ | ❌ | ⚠️ | ❌ |
| **Blockchain Identity** | ✅ | ⚠️ | ✅ | ❌ |
| **Centralized Auth (OAuth)** | ❌ | ❌ | ⚠️ | ❌ |
| **Narrative WoT** | ✅ | ✅ | ✅ | ✅ |

### Why Our Approach?

1. **No central server**: Automerge P2P sync
2. **Privacy-preserving**: Trust relationships visible only to participants
3. **Sybil-resistant**: QR scan requires physical presence
4. **Offline-first**: Works without internet
5. **Cryptographically secure**: Ed25519 signatures

---

## Part 9: Open Questions & Future Work

### Bootstrap Problem

**Problem**: New users have no trust connections.

**Solutions:**
- Default to showing all users
- "Seed trusters" for initial network
- Progressive disclosure as trust grows

### Trust Revocation

**Current**: Delete attestation from both documents.

**Future considerations:**
- Revocation receipts
- Grace period before full revocation
- Notification to revoked party

### Privacy Enhancements

**Current**: Trust relationships visible to participants.

**Future:**
- Zero-knowledge proofs for trust claims
- Selective disclosure of trust graph
- Anonymous attestations

### Performance

**Current**: Signature verification on every render.

**Future:**
- Cache verification results
- Background verification
- Trust graph pre-computation

---

## Part 10: Implementation Status

### ✅ Completed

- [x] Real Ed25519 keypairs with `did:key`
- [x] JWS signature creation and verification
- [x] UserDocument with trustGiven/trustReceived
- [x] QR code generation and scanning
- [x] Bidirectional trust sync
- [x] Trust badges on avatars
- [x] Signature status indicators
- [x] Reciprocity modal for pending requests
- [x] Trust network view (Vertrauensnetzwerk)
- [x] Profile modal with trust actions
- [x] Automatic invalid signature cleanup

### ⏳ Future

- [ ] Transitive trust calculation
- [ ] Trust graph visualization
- [ ] Filter content by trust level
- [ ] Trust depth settings
- [ ] Block list functionality
- [ ] Trust expiration/renewal

---

## References

- **DID Key Method**: https://w3c-ccg.github.io/did-method-key/
- **Ed25519**: https://ed25519.cr.yp.to/
- **JWS (RFC 7515)**: https://tools.ietf.org/html/rfc7515
- **Automerge**: https://automerge.org/
- **Web of Trust (PGP)**: https://en.wikipedia.org/wiki/Web_of_trust
- **Sybil Attack**: https://en.wikipedia.org/wiki/Sybil_attack
