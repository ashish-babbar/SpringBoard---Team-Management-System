import test from 'node:test';
import assert from 'node:assert/strict';
import { detectFileType } from '../src/utils/fileSignatures.js';

test('server detects allowed uploads from file signatures instead of declared MIME type', () => {
  assert.equal(detectFileType(Buffer.from([0xff, 0xd8, 0xff, 0x00])).mime, 'image/jpeg');
  assert.equal(detectFileType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])).mime, 'image/png');
  assert.equal(detectFileType(Buffer.from('RIFFxxxxWEBP')).mime, 'image/webp');
  assert.equal(detectFileType(Buffer.from('%PDF-1.7')).mime, 'application/pdf');
  assert.equal(detectFileType(Buffer.from('<script>alert(1)</script>')), undefined);
});
