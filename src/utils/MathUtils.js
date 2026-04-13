import * as Global from '../constans/Global.js';
export class ColorMath {
  static darken(color, factor = 0.7) {
    if (!color || typeof color !== 'string') {
      return Global.FALLBACK_DARK;
    }
    const hex = color.replace('#', '');
    if (hex.length !== 6) {
      return Global.FALLBACK_DARK;
    }
    const r = Math.floor(parseInt(hex.substring(0, 2), 16) * factor);
    const g = Math.floor(parseInt(hex.substring(2, 4), 16) * factor);
    const b = Math.floor(parseInt(hex.substring(4, 6), 16) * factor);
    return `rgb(${r},${g},${b})`;
  }
}

export class BlockIdentity {
  static generateUUID() {
    const bytes = new Uint8Array(15);
    if (globalThis.crypto?.getRandomValues) {
      globalThis.crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < bytes.length; i++) {
        bytes[i] = Math.floor(Math.random() * 256);
      }
    }
    let result = '';
    for (let i = 0; i < bytes.length; i++) {
      result += Global.UUID_ALPHABET[bytes[i] % Global.UUID_ALPHABET.length];
    }
    while (result.length < 20) {
      const randomIndex = Math.floor(Math.random() * Global.UUID_ALPHABET.length);
      result += Global.UUID_ALPHABET[randomIndex];
    }
    return result.substring(0, 20);
  }
}
