const signatures = [
  { mime: 'image/jpeg', ext: '.jpg', check: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: 'image/png', ext: '.png', check: (b) => b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { mime: 'image/webp', ext: '.webp', check: (b) => b.length >= 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP' },
  { mime: 'application/pdf', ext: '.pdf', check: (b) => b.length >= 5 && b.toString('ascii', 0, 5) === '%PDF-' }
];
export function detectFileType(buffer) {
  if (!Buffer.isBuffer(buffer)) return undefined;
  return signatures.find((item) => item.check(buffer));
}
