// Затемняет переданный цвет
export function darkenColor(color, factor = 0.7) {
    if (!color || typeof color !== 'string') {
      return 'rgba(0,0,0,0.7)';}
      const hex = color.replace('#', '');
      if (hex.length !== 6) {
        return 'rgba(0,0,0,0.7)';}
        const r = Math.floor(parseInt(hex.substring(0, 2), 16) * factor);
        const g = Math.floor(parseInt(hex.substring(2, 4), 16) * factor);
        const b = Math.floor(parseInt(hex.substring(4, 6), 16) * factor);
        return `rgb(${r},${g},${b})`;
    }


// Генерирует уникальный UUID блока
export  function generateUUID() {
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789/%+';
      const bytes = new Uint8Array(15);
      if (crypto && crypto.getRandomValues) {
          crypto.getRandomValues(bytes);
      } else {
          for (let i = 0; i < bytes.length; i++) {
              bytes[i] = Math.floor(Math.random() * 256);
          }
      }
      let result = '';
      for (let i = 0; i < bytes.length; i++) {
          result += alphabet[bytes[i] % alphabet.length];}
      while (result.length < 20) {
          const randomIndex = Math.floor(Math.random() * alphabet.length);
          result += alphabet[randomIndex];}
      return result.substring(0, 20);
  }
      
      