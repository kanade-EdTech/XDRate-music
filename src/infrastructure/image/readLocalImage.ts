const acceptedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const maximumBytes = 10 * 1024 * 1024;

export function validateCoverFile(file: File): string | null {
  if (!acceptedTypes.has(file.type)) {
    return 'unsupported-type';
  }

  if (file.size > maximumBytes) {
    return 'file-too-large';
  }

  return null;
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return hasSupportedImageSignature(file).then((validSignature) => {
    if (!validSignature) throw new Error('unsupported-image-signature');
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('file-read-failed'));
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
          return;
        }
        reject(new Error('file-read-failed'));
      };
      reader.readAsDataURL(file);
    });
  });
}

export async function hasSupportedImageSignature(file: File): Promise<boolean> {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (file.type === 'image/png') {
    return [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte);
  }
  if (file.type === 'image/jpeg') {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (file.type === 'image/webp') {
    return (
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    );
  }
  return false;
}
