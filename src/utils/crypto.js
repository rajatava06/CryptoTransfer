/**
 * Cryptographic utility functions for CryptoTransfer.
 * Performs client-side encryption and decryption using Web Crypto API.
 */

const MAGIC_HEADER = new Uint8Array([0x43, 0x52, 0x59, 0x50]); // "CRYP"

/**
 * Derives an AES-GCM 256-bit key from a password and salt using PBKDF2.
 * @param {string} password 
 * @param {Uint8Array} salt 
 * @returns {Promise<CryptoKey>}
 */
async function deriveKey(password, salt) {
  const enc = new TextEncoder();
  const passwordKey = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a File and packs it into a custom binary ArrayBuffer (.crypto package).
 * Binary format:
 * - 4 bytes: Magic header "CRYP" (0x43, 0x52, 0x59, 0x50)
 * - 16 bytes: Salt
 * - 12 bytes: IV (Initialization Vector)
 * - 4 bytes: Metadata JSON length (Uint32)
 * - N bytes: UTF-8 encoded Metadata (filename, size, type)
 * - Remaining: Ciphertext (AES-GCM output)
 * 
 * @param {File} file 
 * @param {string} password 
 * @param {function(number)} onProgress 
 * @returns {Promise<ArrayBuffer>}
 */
export async function encryptFile(file, password) {
  const fileBytes = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });

  // Generate 16 bytes salt and 12 bytes IV
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  // Derive key and encrypt
  const key = await deriveKey(password, salt);
  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    key,
    fileBytes
  );
  const ciphertextBytes = new Uint8Array(ciphertextBuffer);

  // Prepare metadata
  const metadata = {
    name: file.name,
    size: file.size,
    type: file.type
  };
  const metadataBytes = new TextEncoder().encode(JSON.stringify(metadata));

  // Calculate package size: 4 (magic) + 16 (salt) + 12 (iv) + 4 (metadata length) + N (metadata) + ciphertext
  const packageSize = MAGIC_HEADER.length + salt.length + iv.length + 4 + metadataBytes.length + ciphertextBytes.length;
  const packageBytes = new Uint8Array(packageSize);

  let offset = 0;

  // 1. Magic
  packageBytes.set(MAGIC_HEADER, offset);
  offset += MAGIC_HEADER.length;

  // 2. Salt
  packageBytes.set(salt, offset);
  offset += salt.length;

  // 3. IV
  packageBytes.set(iv, offset);
  offset += iv.length;

  // 4. Metadata length (32-bit big endian uint)
  const metaLenView = new DataView(packageBytes.buffer, packageBytes.byteOffset + offset, 4);
  metaLenView.setUint32(0, metadataBytes.length, false);
  offset += 4;

  // 5. Metadata JSON
  packageBytes.set(metadataBytes, offset);
  offset += metadataBytes.length;

  // 6. Ciphertext
  packageBytes.set(ciphertextBytes, offset);

  return packageBytes.buffer;
}

/**
 * Decrypts a custom .crypto package ArrayBuffer and returns the original File object.
 * @param {ArrayBuffer} packageBuffer 
 * @param {string} password 
 * @returns {Promise<File>}
 */
export async function decryptFile(packageBuffer, password) {
  const packageBytes = new Uint8Array(packageBuffer);

  // 1. Verify Magic
  for (let i = 0; i < MAGIC_HEADER.length; i++) {
    if (packageBytes[i] !== MAGIC_HEADER[i]) {
      throw new Error('Invalid file format. Not a valid CryptoTransfer encrypted package.');
    }
  }

  let offset = MAGIC_HEADER.length;

  // 2. Extract Salt (16 bytes)
  const salt = packageBytes.slice(offset, offset + 16);
  offset += 16;

  // 3. Extract IV (12 bytes)
  const iv = packageBytes.slice(offset, offset + 12);
  offset += 12;

  // 4. Extract Metadata length
  const metaLenView = new DataView(packageBytes.buffer, packageBytes.byteOffset + offset, 4);
  const metadataLen = metaLenView.getUint32(0, false);
  offset += 4;

  // 5. Extract and decode Metadata JSON
  const metadataBytes = packageBytes.slice(offset, offset + metadataLen);
  offset += metadataLen;
  const metadataStr = new TextDecoder().decode(metadataBytes);
  const metadata = JSON.parse(metadataStr);

  // 6. Extract Ciphertext (remaining)
  const ciphertextBytes = packageBytes.slice(offset);

  // Derive key and decrypt
  const key = await deriveKey(password, salt);
  
  try {
    const plaintextBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      ciphertextBytes
    );

    // Create File from decrypted ArrayBuffer
    const blob = new Blob([plaintextBuffer], { type: metadata.type || 'application/octet-stream' });
    return new File([blob], metadata.name, { type: metadata.type || 'application/octet-stream' });
  } catch (err) {
    throw new Error('Decryption failed. Check if your security key/password is correct.');
  }
}

/**
 * Generates a high-entropy memorizable secure key.
 * Format: AETH-XXXX-XXXX-XXXX-XXXX
 * @returns {string}
 */
export function generateSecureKey() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Readable alphanumeric (omitting O, 0, I, 1)
  const segments = [];
  const randomValues = new Uint32Array(16);
  window.crypto.getRandomValues(randomValues);

  for (let i = 0; i < 4; i++) {
    let segment = '';
    for (let j = 0; j < 4; j++) {
      const index = randomValues[i * 4 + j] % chars.length;
      segment += chars[index];
    }
    segments.push(segment);
  }

  return `CRYP-${segments.join('-')}`;
}

/**
 * Evaluates password strength and returns rating and description.
 * @param {string} pwd 
 * @returns {{score: number, label: string}}
 */
export function evaluatePasswordStrength(pwd) {
  if (!pwd) return { score: 0, label: 'None' };
  
  let score = 0;
  if (pwd.length >= 8) score += 1;
  if (pwd.length >= 14) score += 1;
  if (/[A-Z]/.test(pwd)) score += 1;
  if (/[0-9]/.test(pwd)) score += 1;
  if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

  let label = 'Weak';
  if (score >= 4) label = 'Strong';
  else if (score >= 2) label = 'Medium';

  return { score, label };
}
