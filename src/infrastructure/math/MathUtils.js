import * as Global from '../../constants/Global.js';

/**
 * Конечное число или 0 (камера, смещения).
 * @param {number} numericValue
 * @returns {number}
 */
export function finiteOrZero(numericValue) {
  let result;
  if (Number.isFinite(numericValue)) {
    result = numericValue;
  } else {
    result = 0;
  }
  return result;
}

/**
 * Неотрицательное число: NaN, ±∞ и значения ≤ 0 дают 0.
 * @param {number} numericValue
 * @returns {number}
 */
export function clampNonNegative(numericValue) {
  if (!Number.isFinite(numericValue) || numericValue <= 0) return 0;
  return numericValue;
}

export class ColorMath {
  static darken(color, factor = 0.7) {
    if (!color || typeof color !== 'string') {
      return Global.FALLBACK_DARK;
    }
    const hex = color.replace('#', '');
    if (hex.length !== 6) {
      return Global.FALLBACK_DARK;
    }
    const rChannel = Math.floor(parseInt(hex.substring(0, 2), 16) * factor);
    const gChannel = Math.floor(parseInt(hex.substring(2, 4), 16) * factor);
    const bChannel = Math.floor(parseInt(hex.substring(4, 6), 16) * factor);
    return `rgb(${rChannel},${gChannel},${bChannel})`;
  }
}

export class BlockIdentity {
  static generateUUID() {
    const bytes = new Uint8Array(15);
    if (
      globalThis.crypto &&
      typeof globalThis.crypto.getRandomValues === 'function'
    ) {
      globalThis.crypto.getRandomValues(bytes);
    } else {
      for (let index = 0; index < bytes.length; index++) {
        bytes[index] = Math.floor(Math.random() * 256);
      }
    }
    let result = '';
    for (let index = 0; index < bytes.length; index++) {
      result += Global.UUID_ALPHABET[bytes[index] % Global.UUID_ALPHABET.length];
    }
    while (result.length < 20) {
      const randomIndex = Math.floor(
        Math.random() * Global.UUID_ALPHABET.length
      );
      result += Global.UUID_ALPHABET[randomIndex];
    }
    return result.substring(0, 20);
  }
}
