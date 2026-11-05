import fs from 'node:fs';
import zlib from 'node:zlib';

function createPNG(width, height) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2; // RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  function makeChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(4 + 4 + len + 4);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4);
    data.copy(buf, 8);
    const crc = crc32(buf.subarray(4, 8 + len));
    buf.writeUInt32BE(crc, 8 + len);
    return buf;
  }

  const crcTable = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    crcTable[n] = c;
  }

  function crc32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  const scanlineLength = 1 + width * 3;
  const rawData = Buffer.alloc(scanlineLength * height);

  const cx = width / 2;
  const cy = height / 2;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * scanlineLength;
    rawData[rowOffset] = 0;
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 3;
      const dx = (x - cx) / (width / 2);
      const dy = (y - cy) / (height / 2);

      // Symmetrical 4-quadrant check for radial curved brackets
      const ax = Math.abs(dx);
      const ay = Math.abs(dy);

      // Distance from inner corner
      const isEmblem = (
        (ax > 0.08 && ax < 0.65 && ay > 0.08 && ay < 0.65) &&
        (Math.abs((ax - 0.35) * (ax - 0.35) + (ay - 0.35) * (ay - 0.35) - 0.08) < 0.06 ||
         (ax > 0.12 && ax < 0.25 && ay > 0.25 && ay < 0.60) ||
         (ay > 0.12 && ay < 0.25 && ax > 0.25 && ax < 0.60))
      );

      if (isEmblem) {
        // Terracotta orange #DA4B2A
        rawData[pxOffset] = 218;
        rawData[pxOffset + 1] = 75;
        rawData[pxOffset + 2] = 42;
      } else {
        // Dark grey #202020
        rawData[pxOffset] = 32;
        rawData[pxOffset + 1] = 32;
        rawData[pxOffset + 2] = 32;
      }
    }
  }

  const compressed = zlib.deflateSync(rawData);
  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0))
  ]);
}

if (!fs.existsSync('./public')) {
  fs.mkdirSync('./public', { recursive: true });
}

fs.writeFileSync('./public/pwa-192x192.png', createPNG(192, 192));
fs.writeFileSync('./public/pwa-512x512.png', createPNG(512, 512));
fs.writeFileSync('./public/pwa-maskable-512x512.png', createPNG(512, 512));
fs.writeFileSync('./public/apple-touch-icon.png', createPNG(180, 180));
fs.writeFileSync('./public/favicon.ico', createPNG(32, 32));

console.log('Regenerated new logo icons successfully');
