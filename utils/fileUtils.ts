export const fileToBase64 = (file: File): Promise<{ base64: string, mimeType: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      const mimeType = file.type;
      
      resolve({ base64, mimeType });
    };
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Encode data for a share link: JSON -> UTF-8 bytes -> base64.
 * (Plain btoa(JSON.stringify(...)) throws on any character outside Latin-1, e.g. "ø" in "Sørensen".)
 */
export const encodeShareData = (data: unknown): string => {
  const bytes = new TextEncoder().encode(JSON.stringify(data));
  let binary = '';
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary);
};

/**
 * Decode a share link payload. New links are UTF-8; older links were plain
 * btoa(JSON) text, so fall back to that when the bytes aren't valid UTF-8.
 */
export const decodeShareData = (encoded: string): unknown => {
  const binary = atob(encoded);
  try {
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    return JSON.parse(binary);
  }
};
