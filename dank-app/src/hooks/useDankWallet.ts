/**
 * useDankWallet - Primary hook for Dank Wallet operations
 *
 * Provides:
 * - Voucher creation with issuer signature
 * - Voucher transfer with chain signature
 * - Balance calculation
 * - Signature validation with caching
 */

import { useCallback, useMemo, useState, useEffect } from 'react';
import type { DocumentId } from '@automerge/automerge-repo';
import { useDocHandle, useDocument } from '@automerge/automerge-repo-react-hooks';
import { signJws, verifyJws, extractPublicKeyFromDid } from 'narrative-ui';
import type {
  DankWalletDoc,
  Voucher,
  Transfer,
  ValidationResult,
  SignatureStatus,
  UnitBalance,
} from '../schema';
import {
  generateId,
  calculateBalances,
  getVoucherStatus,
  getActiveHeldVouchers,
  getIssuedVouchers,
  getHeldVouchers,
} from '../schema';

/**
 * Payload for issuer signature
 */
interface IssuerSignaturePayload {
  id: string;
  issuerId: string;
  amount: number;
  unit: string;
  createdAt: number;
  expiresAt?: number;
  initialRecipientId: string;
}

/**
 * Payload for transfer signature
 */
interface TransferSignaturePayload {
  voucherId: string;
  fromId: string;
  toId: string;
  timestamp: number;
  previousSignature: string;
}

/**
 * Hook options
 */
interface UseDankWalletOptions {
  documentId: DocumentId | null;
  currentUserDid: string;
  privateKey?: string;
}

/**
 * Validation cache (in-memory, per session)
 */
const validationCache = new Map<string, ValidationResult>();

/**
 * Cache TTL in milliseconds (5 minutes)
 */
const CACHE_TTL = 5 * 60 * 1000;

export function useDankWallet({
  documentId,
  currentUserDid,
  privateKey,
}: UseDankWalletOptions) {
  // In automerge-repo v2.x, useDocHandle handles async loading
  // Handle null docId case - hooks must be called unconditionally
  const docHandle = useDocHandle<DankWalletDoc>(documentId ?? undefined);
  const [doc] = useDocument<DankWalletDoc>(documentId ?? undefined);

  // Track validation results for UI
  const [validationResults, setValidationResults] = useState<
    Map<string, ValidationResult>
  >(new Map());

  /**
   * Create a new voucher and send to recipient
   */
  const createVoucher = useCallback(
    async (params: {
      recipientId: string;
      amount: number;
      unit: string;
      note?: string;
      expiresAt?: number;
    }) => {
      if (!privateKey) {
        throw new Error('Private key required to sign voucher');
      }

      const id = generateId();
      const createdAt = Date.now();

      // Create payload for issuer signature
      const signaturePayload: IssuerSignaturePayload = {
        id,
        issuerId: currentUserDid,
        amount: params.amount,
        unit: params.unit,
        createdAt,
        initialRecipientId: params.recipientId,
      };

      if (params.expiresAt) {
        signaturePayload.expiresAt = params.expiresAt;
      }

      // Sign the voucher
      const issuerSignature = await signJws(signaturePayload, privateKey);

      // Build voucher object - Automerge doesn't allow undefined values
      const voucher: Voucher = {
        id,
        issuerId: currentUserDid,
        amount: params.amount,
        unit: params.unit,
        createdAt,
        initialRecipientId: params.recipientId,
        currentHolderId: params.recipientId,
        status: 'active',
        issuerSignature,
        transfers: [],
      };

      // Only add optional fields if they have values
      if (params.note) {
        voucher.note = params.note;
      }
      if (params.expiresAt) {
        voucher.expiresAt = params.expiresAt;
      }

      // Check if recipient is the issuer (immediate redemption)
      if (params.recipientId === currentUserDid) {
        voucher.status = 'redeemed';
        voucher.redeemedAt = createdAt;
      }

      if (!docHandle) {
        throw new Error('Document handle not ready');
      }

      docHandle.change((d) => {
        d.data.vouchers[id] = voucher;
        d.lastModified = Date.now();
      });

      return voucher;
    },
    [docHandle, currentUserDid, privateKey]
  );

  /**
   * Transfer a voucher to another user
   */
  const transferVoucher = useCallback(
    async (voucherId: string, toId: string, note?: string) => {
      if (!privateKey) {
        throw new Error('Private key required to sign transfer');
      }

      if (!doc) {
        throw new Error('Document not loaded');
      }

      const voucher = doc.data.vouchers[voucherId];
      if (!voucher) {
        throw new Error('Voucher not found');
      }

      if (voucher.currentHolderId !== currentUserDid) {
        throw new Error('You are not the current holder of this voucher');
      }

      if (getVoucherStatus(voucher) !== 'active') {
        throw new Error('Voucher is not active');
      }

      const timestamp = Date.now();
      const transferId = generateId();

      // Get previous signature (last transfer or issuer signature)
      const previousSignature =
        voucher.transfers.length > 0
          ? voucher.transfers[voucher.transfers.length - 1].signature
          : voucher.issuerSignature;

      // Create payload for transfer signature
      const signaturePayload: TransferSignaturePayload = {
        voucherId,
        fromId: currentUserDid,
        toId,
        timestamp,
        previousSignature,
      };

      // Sign the transfer
      const signature = await signJws(signaturePayload, privateKey);

      // Build transfer object - Automerge doesn't allow undefined values
      const transfer: Transfer = {
        id: transferId,
        voucherId,
        fromId: currentUserDid,
        toId,
        timestamp,
        signature,
      };

      // Only add optional fields if they have values
      if (note) {
        transfer.note = note;
      }

      if (!docHandle) {
        throw new Error('Document handle not ready');
      }

      docHandle.change((d) => {
        const v = d.data.vouchers[voucherId];
        if (v) {
          v.transfers.push(transfer);
          v.currentHolderId = toId;

          // Check if voucher returned to issuer
          if (toId === v.issuerId) {
            v.status = 'redeemed';
            v.redeemedAt = timestamp;
          }

          d.lastModified = Date.now();
        }
      });

      // Invalidate cache for this voucher
      validationCache.delete(voucherId);

      return transfer;
    },
    [docHandle, doc, currentUserDid, privateKey]
  );

  /**
   * Validate a voucher's signature chain
   */
  const validateVoucher = useCallback(
    async (voucherId: string): Promise<ValidationResult> => {
      // Check cache first
      const cached = validationCache.get(voucherId);
      if (cached && Date.now() - cached.lastValidated < CACHE_TTL) {
        return cached;
      }

      if (!doc) {
        return {
          voucherId,
          issuerSignatureStatus: 'unknown',
          transferSignatureStatuses: [],
          overallStatus: 'unknown',
          lastValidated: Date.now(),
          error: 'Document not loaded',
        };
      }

      const voucher = doc.data.vouchers[voucherId];
      if (!voucher) {
        return {
          voucherId,
          issuerSignatureStatus: 'unknown',
          transferSignatureStatuses: [],
          overallStatus: 'unknown',
          lastValidated: Date.now(),
          error: 'Voucher not found',
        };
      }

      const result: ValidationResult = {
        voucherId,
        issuerSignatureStatus: 'unknown',
        transferSignatureStatuses: [],
        overallStatus: 'unknown',
        lastValidated: Date.now(),
      };

      try {
        // Get issuer's public key from identities
        const issuerProfile = doc.identities[voucher.issuerId];
        if (!issuerProfile?.publicKey) {
          // Try to extract from DID
          try {
            const pubKeyBytes = extractPublicKeyFromDid(voucher.issuerId);
            // Convert to base64 for verification
            const pubKeyBase64 = btoa(String.fromCharCode(...pubKeyBytes));

            // Verify issuer signature
            const issuerPayload: IssuerSignaturePayload = {
              id: voucher.id,
              issuerId: voucher.issuerId,
              amount: voucher.amount,
              unit: voucher.unit,
              createdAt: voucher.createdAt,
              initialRecipientId: voucher.initialRecipientId,
            };
            if (voucher.expiresAt) {
              issuerPayload.expiresAt = voucher.expiresAt;
            }

            const issuerResult = await verifyJws(
              voucher.issuerSignature,
              pubKeyBase64
            );
            result.issuerSignatureStatus = issuerResult.valid
              ? 'valid'
              : 'invalid';
          } catch {
            result.issuerSignatureStatus = 'unknown';
          }
        } else {
          // Use stored public key
          const issuerPayload: IssuerSignaturePayload = {
            id: voucher.id,
            issuerId: voucher.issuerId,
            amount: voucher.amount,
            unit: voucher.unit,
            createdAt: voucher.createdAt,
            initialRecipientId: voucher.initialRecipientId,
          };
          if (voucher.expiresAt) {
            issuerPayload.expiresAt = voucher.expiresAt;
          }

          const issuerResult = await verifyJws(
            voucher.issuerSignature,
            issuerProfile.publicKey
          );
          result.issuerSignatureStatus = issuerResult.valid ? 'valid' : 'invalid';
        }

        // Verify transfer chain
        // Note: JWS verification is done on each signature individually.
        // Each transfer's signature includes previousSignature in its payload,
        // which links the chain. Full chain validation could decode each JWS
        // and compare the previousSignature values.

        for (const transfer of voucher.transfers) {
          let transferStatus: SignatureStatus = 'unknown';

          try {
            // Get sender's public key
            const senderProfile = doc.identities[transfer.fromId];
            let pubKeyBase64: string | undefined = senderProfile?.publicKey;

            if (!pubKeyBase64) {
              // Try to extract from DID
              try {
                const pubKeyBytes = extractPublicKeyFromDid(transfer.fromId);
                pubKeyBase64 = btoa(String.fromCharCode(...pubKeyBytes));
              } catch {
                // Can't get public key
              }
            }

            if (pubKeyBase64) {
              // Note: The signature payload that was signed is:
              // { voucherId, fromId, toId, timestamp, previousSignature }
              // verifyJws will decode and verify the payload from the JWS itself

              const transferResult = await verifyJws(
                transfer.signature,
                pubKeyBase64
              );
              transferStatus = transferResult.valid ? 'valid' : 'invalid';
            }
          } catch {
            transferStatus = 'invalid';
          }

          result.transferSignatureStatuses.push(transferStatus);
        }

        // Determine overall status
        const allStatuses = [
          result.issuerSignatureStatus,
          ...result.transferSignatureStatuses,
        ];

        if (allStatuses.includes('invalid')) {
          result.overallStatus = 'invalid';
        } else if (allStatuses.includes('unknown')) {
          result.overallStatus = 'unknown';
        } else {
          result.overallStatus = 'valid';
        }
      } catch (error) {
        result.overallStatus = 'invalid';
        result.error =
          error instanceof Error ? error.message : 'Validation failed';
      }

      // Cache result
      validationCache.set(voucherId, result);

      // Update state for UI
      setValidationResults((prev) => new Map(prev).set(voucherId, result));

      return result;
    },
    [doc]
  );

  /**
   * Validate all vouchers held by current user
   */
  const validateHeldVouchers = useCallback(async () => {
    if (!doc) return;

    const heldVouchers = getHeldVouchers(doc.data.vouchers, currentUserDid);

    for (const voucher of heldVouchers) {
      await validateVoucher(voucher.id);
    }
  }, [doc, currentUserDid, validateVoucher]);

  // Auto-validate held vouchers on mount and when doc changes
  useEffect(() => {
    if (doc) {
      validateHeldVouchers();
    }
  }, [doc?.data.vouchers, validateHeldVouchers]);

  /**
   * Get balances for current user
   */
  const balances = useMemo<UnitBalance[]>(() => {
    if (!doc) return [];
    return calculateBalances(doc.data.vouchers, currentUserDid);
  }, [doc, currentUserDid]);

  /**
   * Get active vouchers held by current user
   */
  const activeVouchers = useMemo<Voucher[]>(() => {
    if (!doc) return [];
    return getActiveHeldVouchers(doc.data.vouchers, currentUserDid);
  }, [doc, currentUserDid]);

  /**
   * Get vouchers issued by current user
   */
  const issuedVouchers = useMemo<Voucher[]>(() => {
    if (!doc) return [];
    return getIssuedVouchers(doc.data.vouchers, currentUserDid);
  }, [doc, currentUserDid]);

  /**
   * Get all vouchers held by current user (including redeemed/expired)
   */
  const allHeldVouchers = useMemo<Voucher[]>(() => {
    if (!doc) return [];
    return getHeldVouchers(doc.data.vouchers, currentUserDid);
  }, [doc, currentUserDid]);

  /**
   * Get validation result for a voucher
   */
  const getValidationResult = useCallback(
    (voucherId: string): ValidationResult | undefined => {
      return validationResults.get(voucherId);
    },
    [validationResults]
  );

  return {
    doc,
    docHandle,

    // Mutations
    createVoucher,
    transferVoucher,

    // Queries
    balances,
    activeVouchers,
    issuedVouchers,
    allHeldVouchers,

    // Validation
    validateVoucher,
    validateHeldVouchers,
    getValidationResult,
    validationResults,
  };
}
