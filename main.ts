// THE WORLD IN ONE DAY — Saturday 21 November 2026.
// A dense front-page poster summing up the day's world news, drawn programmatically
// in pure Node.js (standard library only). No network, no clock, no randomness:
// two runs produce a byte-identical entry.png.
//
// The poster: a masthead with the date, one lead story, and a grid of 41 more stories
// across 7 regions. Every story was date-checked for 21 November 2026 and tagged:
//   R = reported fact, C = claim (not yet verified), F = forecast.
// All data lives in this file. The PNG is encoded by hand (zlib for the pixels,
// a small CRC32 for the chunks) so the program needs no dependency at all.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

const W = 1024;
const H = 1024;
const OUT = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// ---------- palette ----------
type RGB = [number, number, number];
const PAPER: RGB = [247, 243, 234];
const INK: RGB = [26, 26, 26];
const CARD: RGB = [255, 255, 255];
const RULE: RGB = [154, 147, 138];
const SOFT: RGB = [232, 226, 212];
const RED: RGB = [179, 39, 30];
const BLUE: RGB = [31, 78, 121];
const GOLD: RGB = [201, 162, 39];
const GREEN: RGB = [46, 125, 50];
const AMBER: RGB = [178, 106, 0];
const TEAL: RGB = [15, 118, 110];
const PURPLE: RGB = [106, 27, 154];
const SLATE: RGB = [55, 71, 79];
const SKY: RGB = [38, 58, 86];
const ORANGE: RGB = [230, 126, 34];
const SMOKE: RGB = [120, 120, 120];

// ---------- 5x7 bitmap font (uppercase, digits, punctuation) ----------
// Each glyph is 7 rows; bit 4 is the leftmost pixel, bit 0 the rightmost.
const FONT: Record<string, number[]> = {
  A: [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  B: [0x1e, 0x11, 0x11, 0x1e, 0x11, 0x11, 0x1e],
  C: [0x0e, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0e],
  D: [0x1e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1e],
  E: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x1f],
  F: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10],
  G: [0x0e, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0f],
  H: [0x11, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  I: [0x0e, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
  J: [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0c],
  K: [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
  L: [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f],
  M: [0x11, 0x1b, 0x15, 0x15, 0x11, 0x11, 0x11],
  N: [0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x11],
  O: [0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  P: [0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10],
  Q: [0x0e, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0d],
  R: [0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11],
  S: [0x0f, 0x10, 0x10, 0x0e, 0x01, 0x01, 0x1e],
  T: [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  U: [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  V: [0x11, 0x11, 0x11, 0x11, 0x11, 0x0a, 0x04],
  W: [0x11, 0x11, 0x11, 0x15, 0x15, 0x1b, 0x11],
  X: [0x11, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0x11],
  Y: [0x11, 0x11, 0x0a, 0x04, 0x04, 0x04, 0x04],
  Z: [0x1f, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1f],
  '0': [0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e],
  '1': [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
  '2': [0x0e, 0x11, 0x01, 0x06, 0x08, 0x10, 0x1f],
  '3': [0x1f, 0x02, 0x04, 0x02, 0x01, 0x11, 0x0e],
  '4': [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02],
  '5': [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e],
  '6': [0x06, 0x08, 0x10, 0x1e, 0x11, 0x11, 0x0e],
  '7': [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  '8': [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e],
  '9': [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x02, 0x0c],
  ' ': [0, 0, 0, 0, 0, 0, 0],
  '.': [0, 0, 0, 0, 0, 0x0c, 0x0c],
  ',': [0, 0, 0, 0, 0x0c, 0x04, 0x08],
  ':': [0, 0x0c, 0x0c, 0, 0x0c, 0x0c, 0],
  ';': [0, 0x0c, 0x0c, 0, 0x0c, 0x04, 0x08],
  '!': [0x04, 0x04, 0x04, 0x04, 0x04, 0, 0x04],
  '?': [0x0e, 0x11, 0x01, 0x02, 0x04, 0, 0x04],
  '-': [0, 0, 0, 0x1f, 0, 0, 0],
  "'": [0x04, 0x04, 0x08, 0, 0, 0, 0],
  '(': [0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02],
  ')': [0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08],
  '&': [0x0c, 0x12, 0x14, 0x08, 0x15, 0x12, 0x0d],
  '/': [0x01, 0x02, 0x02, 0x04, 0x08, 0x08, 0x10],
  '%': [0x18, 0x19, 0x02, 0x04, 0x08, 0x13, 0x03],
  '$': [0x04, 0x0f, 0x14, 0x0e, 0x05, 0x1e, 0x04],
  '#': [0x0a, 0x0a, 0x1f, 0x0a, 0x1f, 0x0a, 0x0a],
  '+': [0, 0x04, 0x04, 0x1f, 0x04, 0x04, 0],
  '=': [0, 0, 0x1f, 0, 0x1f, 0, 0],
  '"': [0x0a, 0x0a, 0x0a, 0, 0, 0, 0],
  '*': [0, 0x04, 0x15, 0x0e, 0x15, 0x04, 0],
};

// ---------- CRC32 (IEEE) ----------
const CRC_TABLE: Uint32Array = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]!) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function encodePNG(img: Buffer, w: number, h: number): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const raw = Buffer.alloc(h * (1 + w * 3));
  for (let y = 0; y < h; y++) {
    raw[y * (1 + w * 3)] = 0; // filter: none
    img.copy(raw, y * (1 + w * 3) + 1, y * w * 3, (y + 1) * w * 3);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------- canvas ----------
const px = Buffer.alloc(W * H * 3);
function setPixel(x: number, y: number, c: RGB): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2];
}
function fillRect(x: number, y: number, w: number, h: number, c: RGB): void {
  const x0 = Math.max(0, Math.floor(x));
  const y0 = Math.max(0, Math.floor(y));
  const x1 = Math.min(W, Math.ceil(x + w));
  const y1 = Math.min(H, Math.ceil(y + h));
  for (let yy = y0; yy < y1; yy++) {
    for (let xx = x0; xx < x1; xx++) {
      const i = (yy * W + xx) * 3;
      px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2];
    }
  }
}
function drawRect(x: number, y: number, w: number, h: number, c: RGB, t = 1): void {
  fillRect(x, y, w, t, c);
  fillRect(x, y + h - t, w, t, c);
  fillRect(x, y, t, h, c);
  fillRect(x + w - t, y, t, h, c);
}
function drawLine(x0: number, y0: number, x1: number, y1: number, c: RGB): void {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    setPixel(x, y, c);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
}
function fillCircle(cx: number, cy: number, r: number, c: RGB): void {
  for (let y = -r; y <= r; y++) {
    const w = Math.floor(Math.sqrt(r * r - y * y));
    for (let x = -w; x <= w; x++) setPixel(cx + x, cy + y, c);
  }
}
function drawCircle(cx: number, cy: number, r: number, c: RGB): void {
  let x = r;
  let y = 0;
  let err = 0;
  while (x >= y) {
    setPixel(cx + x, cy + y, c); setPixel(cx + y, cy + x, c);
    setPixel(cx - y, cy + x, c); setPixel(cx - x, cy + y, c);
    setPixel(cx - x, cy - y, c); setPixel(cx - y, cy - x, c);
    setPixel(cx + y, cy - x, c); setPixel(cx + x, cy - y, c);
    y++;
    err += 1 + 2 * y;
    if (2 * (err - x) + 1 > 0) { x--; err += 1 - 2 * x; }
  }
}
function fillTriangle(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, c: RGB): void {
  const minX = Math.max(0, Math.min(x0, x1, x2));
  const maxX = Math.min(W - 1, Math.max(x0, x1, x2));
  const minY = Math.max(0, Math.min(y0, y1, y2));
  const maxY = Math.min(H - 1, Math.max(y0, y1, y2));
  const d = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2);
  if (d === 0) return;
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const a = ((y1 - y2) * (x - x2) + (x2 - x1) * (y - y2)) / d;
      const b = ((y2 - y0) * (x - x2) + (x0 - x2) * (y - y2)) / d;
      const cc = 1 - a - b;
      if (a >= 0 && b >= 0 && cc >= 0) setPixel(x, y, c);
    }
  }
}

// ---------- text ----------
function textWidth(s: string, scale: number): number {
  return s.length * 6 * scale - scale;
}
function drawText(x: number, y: number, s: string, scale: number, c: RGB): void {
  const up = s.toUpperCase();
  let cx = x;
  for (const ch of up) {
    const g = FONT[ch] ?? FONT['?']!;
    for (let r = 0; r < 7; r++) {
      const row = g[r]!;
      for (let col = 0; col < 5; col++) {
        if ((row >> (4 - col)) & 1) {
          fillRect(cx + col * scale, y + r * scale, scale, scale, c);
        }
      }
    }
    cx += 6 * scale;
  }
}
function drawTextCentered(x: number, y: number, w: number, s: string, scale: number, c: RGB): void {
  drawText(x + Math.floor((w - textWidth(s, scale)) / 2), y, s, scale, c);
}
// Wrap text to lines that fit maxW pixels at the given scale; at most maxLines.
function wrapText(s: string, scale: number, maxW: number, maxLines: number): string[] {
  const words = s.toUpperCase().split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const word of words) {
    const test = cur === '' ? word : cur + ' ' + word;
    if (textWidth(test, scale) <= maxW || cur === '') {
      cur = test;
    } else {
      lines.push(cur);
      cur = word;
      if (lines.length === maxLines) return lines;
    }
  }
  if (cur !== '' && lines.length < maxLines) lines.push(cur);
  return lines;
}
function drawTextBlock(x: number, y: number, s: string, scale: number, maxW: number, maxLines: number, c: RGB, leading?: number): number {
  const lines = wrapText(s, scale, maxW, maxLines);
  const lh = 7 * scale + (leading ?? 2);
  for (let i = 0; i < lines.length; i++) drawText(x, y + i * lh, lines[i]!, scale, c);
  return lines.length;
}

// ---------- small pictogram icons ----------
// Each icon draws inside a box centred on (cx, cy), about 2*s across.
type IconFn = (cx: number, cy: number, s: number, c: RGB) => void;
function fillStar(cx: number, cy: number, r: number, c: RGB): void {
  const pts: [number, number][] = [];
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.45;
    pts.push([cx + Math.round(rr * Math.cos(ang)), cy + Math.round(rr * Math.sin(ang))]);
  }
  for (let i = 0; i < 10; i++) {
    const a = pts[i]!;
    const b = pts[(i + 1) % 10]!;
    fillTriangle(cx, cy, a[0], a[1], b[0], b[1], c);
  }
}
const ICONS: Record<string, IconFn> = {
  blast(cx, cy, s, c) {
    fillCircle(cx, cy, Math.max(2, Math.round(s * 0.28)), c);
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      const r1 = s * 0.35;
      const r2 = s * (i % 2 === 0 ? 1 : 0.75);
      drawLine(
        Math.round(cx + r1 * Math.cos(a)), Math.round(cy + r1 * Math.sin(a)),
        Math.round(cx + r2 * Math.cos(a)), Math.round(cy + r2 * Math.sin(a)), c,
      );
    }
  },
  chartDown(cx, cy, s, c) {
    drawLine(cx - s, cy + s, cx - s, cy - s, c);
    drawLine(cx - s, cy + s, cx + s, cy + s, c);
    drawLine(cx - s + 2, cy - s + 4, cx - 1, cy - 1, c);
    drawLine(cx - 1, cy - 1, cx + s - 2, cy + s - 4, c);
    drawLine(cx + s - 2, cy + s - 4, cx + s - 2, cy + s - 8, c);
    drawLine(cx + s - 2, cy + s - 4, cx + s - 6, cy + s - 4, c);
  },
  shield(cx, cy, s, c) {
    drawLine(cx - s, cy - s + 2, cx - s, cy, c);
    drawLine(cx - s, cy, cx, cy + s, c);
    drawLine(cx, cy + s, cx + s, cy, c);
    drawLine(cx + s, cy, cx + s, cy - s + 2, c);
    drawLine(cx - s, cy - s + 2, cx, cy - s - 1, c);
    drawLine(cx, cy - s - 1, cx + s, cy - s + 2, c);
    drawLine(cx - Math.round(s * 0.45), cy, cx - 1, cy + Math.round(s * 0.35), c);
    drawLine(cx - 1, cy + Math.round(s * 0.35), cx + Math.round(s * 0.5), cy - Math.round(s * 0.45), c);
  },
  building(cx, cy, s, c) {
    fillTriangle(cx - s, cy - s + 2, cx + s, cy - s + 2, cx, cy - s - 2, c);
    fillRect(cx - s, cy - s + 4, s * 2, 2, c);
    for (const off of [-0.6, 0, 0.6]) {
      fillRect(Math.round(cx + off * s - 1), cy - s + 7, 2, s + 2, c);
    }
    fillRect(cx - s, cy + s - 1, s * 2, 2, c);
  },
  globe(cx, cy, s, c) {
    drawCircle(cx, cy, s, c);
    drawLine(cx - s, cy, cx + s, cy, c);
    drawLine(cx, cy - s, cx, cy + s, c);
    drawLine(cx - Math.round(s * 0.7), cy - Math.round(s * 0.7), cx + Math.round(s * 0.7), cy - Math.round(s * 0.7), c);
    drawLine(cx - Math.round(s * 0.7), cy + Math.round(s * 0.7), cx + Math.round(s * 0.7), cy + Math.round(s * 0.7), c);
  },
  rocket(cx, cy, s, c) {
    fillTriangle(cx, cy - s, cx - Math.round(s * 0.45), cy + Math.round(s * 0.3), cx + Math.round(s * 0.45), cy + Math.round(s * 0.3), c);
    fillTriangle(cx - Math.round(s * 0.45), cy, cx - s, cy + Math.round(s * 0.7), cx - Math.round(s * 0.2), cy + Math.round(s * 0.5), c);
    fillTriangle(cx + Math.round(s * 0.45), cy, cx + s, cy + Math.round(s * 0.7), cx + Math.round(s * 0.2), cy + Math.round(s * 0.5), c);
    fillTriangle(cx - 2, cy + Math.round(s * 0.4), cx + 2, cy + Math.round(s * 0.4), cx, cy + s, ORANGE);
    fillCircle(cx, cy - Math.round(s * 0.25), Math.max(1, Math.round(s * 0.18)), PAPER);
  },
  cross(cx, cy, s, c) {
    drawCircle(cx, cy, s, c);
    fillRect(cx - 1, cy - Math.round(s * 0.6), 3, Math.round(s * 1.2), c);
    fillRect(cx - Math.round(s * 0.6), cy - 1, Math.round(s * 1.2), 3, c);
  },
  ball(cx, cy, s, c) {
    drawCircle(cx, cy, s, c);
    fillCircle(cx, cy, Math.max(1, Math.round(s * 0.25)), c);
    for (let i = 0; i < 5; i++) {
      const a = (i * 2 * Math.PI) / 5 - Math.PI / 2;
      drawLine(cx, cy, Math.round(cx + s * Math.cos(a)), Math.round(cy + s * Math.sin(a)), c);
    }
  },
  flame(cx, cy, s, c) {
    fillCircle(cx, cy + Math.round(s * 0.3), Math.round(s * 0.55), ORANGE);
    fillTriangle(cx - Math.round(s * 0.5), cy + Math.round(s * 0.4), cx + Math.round(s * 0.5), cy + Math.round(s * 0.4), cx, cy - s, ORANGE);
    fillCircle(cx, cy + Math.round(s * 0.35), Math.max(1, Math.round(s * 0.25)), GOLD);
  },
  wave(cx, cy, s, c) {
    for (const dy of [-0.5, 0, 0.5]) {
      for (let x = -s; x <= s; x += 2) {
        const y = Math.round(cy + dy * s + Math.sin((x / s) * Math.PI) * 2);
        setPixel(cx + x, y, c);
        setPixel(cx + x, y + 1, c);
      }
    }
  },
  ship(cx, cy, s, c) {
    drawLine(cx, cy - s, cx, cy + Math.round(s * 0.4), c);
    drawLine(cx, cy - s, cx + Math.round(s * 0.6), cy - Math.round(s * 0.6), c);
    fillRect(cx - s, cy + Math.round(s * 0.4), s * 2, Math.round(s * 0.5), c);
    fillTriangle(cx - s, cy + Math.round(s * 0.4), cx + s, cy + Math.round(s * 0.4), cx + Math.round(s * 0.7), cy + s, c);
  },
  gavel(cx, cy, s, c) {
    drawLine(cx - s, cy + s, cx + s, cy - s, c);
    fillRect(cx + Math.round(s * 0.2), cy - s, Math.round(s * 0.8), 3, c);
    fillRect(cx - Math.round(s * 0.2), cy - s + 3, Math.round(s * 0.8), 3, c);
    fillRect(cx - s, cy + s - 2, s * 2, 2, c);
  },
  coin(cx, cy, s, c) {
    drawCircle(cx, cy, s, c);
    drawText(cx - 2, cy - 3, '$', 1, c);
  },
  leaf(cx, cy, s, c) {
    fillCircle(cx, cy, Math.round(s * 0.7), c);
    drawLine(cx - Math.round(s * 0.5), cy + Math.round(s * 0.5), cx + Math.round(s * 0.5), cy - Math.round(s * 0.5), PAPER);
    drawLine(cx, cy + Math.round(s * 0.7), cx - Math.round(s * 0.3), cy + s, c);
  },
  bug(cx, cy, s, c) {
    fillCircle(cx, cy, Math.round(s * 0.45), c);
    for (const dy of [-0.4, 0, 0.4]) {
      drawLine(cx - Math.round(s * 0.3), cy + Math.round(dy * s), cx - s, cy + Math.round(dy * s) - 2, c);
      drawLine(cx + Math.round(s * 0.3), cy + Math.round(dy * s), cx + s, cy + Math.round(dy * s) - 2, c);
    }
    drawLine(cx - 2, cy - Math.round(s * 0.4), cx - Math.round(s * 0.5), cy - s, c);
    drawLine(cx + 2, cy - Math.round(s * 0.4), cx + Math.round(s * 0.5), cy - s, c);
  },
  robot(cx, cy, s, c) {
    drawRect(cx - Math.round(s * 0.7), cy - Math.round(s * 0.6), Math.round(s * 1.4), Math.round(s * 1.2), c, 1);
    fillRect(cx - Math.round(s * 0.4), cy - Math.round(s * 0.25), 3, 3, c);
    fillRect(cx + Math.round(s * 0.4) - 2, cy - Math.round(s * 0.25), 3, 3, c);
    drawLine(cx, cy - Math.round(s * 0.6), cx, cy - s, c);
    fillCircle(cx, cy - s, 1, c);
    drawLine(cx - Math.round(s * 0.4), cy + Math.round(s * 0.35), cx + Math.round(s * 0.4), cy + Math.round(s * 0.35), c);
  },
  flag(cx, cy, s, c) {
    drawLine(cx - Math.round(s * 0.5), cy - s, cx - Math.round(s * 0.5), cy + s, c);
    fillRect(cx - Math.round(s * 0.5), cy - s, Math.round(s * 1.5), Math.round(s * 0.7), c);
    fillTriangle(cx + s, cy - s, cx + s, cy - Math.round(s * 0.3), cx + Math.round(s * 0.6), cy - Math.round(s * 0.65), PAPER);
  },
  star(cx, cy, s, c) {
    fillStar(cx, cy, s, c);
  },
  scale(cx, cy, s, c) {
    drawLine(cx, cy - s, cx, cy + s, c);
    drawLine(cx - s, cy - Math.round(s * 0.6), cx + s, cy - Math.round(s * 0.6), c);
    drawLine(cx - s, cy - Math.round(s * 0.6), cx - s, cy - Math.round(s * 0.2), c);
    drawLine(cx + s, cy - Math.round(s * 0.6), cx + s, cy - Math.round(s * 0.2), c);
    fillTriangle(cx - s - 3, cy - Math.round(s * 0.2), cx - s + 3, cy - Math.round(s * 0.2), cx - s, cy + Math.round(s * 0.2), c);
    fillTriangle(cx + s - 3, cy - Math.round(s * 0.2), cx + s + 3, cy - Math.round(s * 0.2), cx + s, cy + Math.round(s * 0.2), c);
    drawLine(cx - Math.round(s * 0.4), cy + s, cx + Math.round(s * 0.4), cy + s, c);
  },
  car(cx, cy, s, c) {
    fillRect(cx - s, cy - Math.round(s * 0.1), s * 2, Math.round(s * 0.6), c);
    fillRect(cx - Math.round(s * 0.55), cy - Math.round(s * 0.6), Math.round(s * 1.1), Math.round(s * 0.55), c);
    fillCircle(cx - Math.round(s * 0.55), cy + Math.round(s * 0.55), Math.max(2, Math.round(s * 0.28)), c);
    fillCircle(cx + Math.round(s * 0.55), cy + Math.round(s * 0.55), Math.max(2, Math.round(s * 0.28)), c);
  },
  book(cx, cy, s, c) {
    drawRect(cx - Math.round(s * 0.8), cy - Math.round(s * 0.7), Math.round(s * 1.6), Math.round(s * 1.4), c, 1);
    drawLine(cx, cy - Math.round(s * 0.7), cx, cy + Math.round(s * 0.7), c);
    drawLine(cx - Math.round(s * 0.6), cy - Math.round(s * 0.35), cx - Math.round(s * 0.15), cy - Math.round(s * 0.35), c);
    drawLine(cx - Math.round(s * 0.6), cy, cx - Math.round(s * 0.15), cy, c);
    drawLine(cx + Math.round(s * 0.15), cy - Math.round(s * 0.35), cx + Math.round(s * 0.6), cy - Math.round(s * 0.35), c);
    drawLine(cx + Math.round(s * 0.15), cy, cx + Math.round(s * 0.6), cy, c);
  },
  anchor(cx, cy, s, c) {
    drawLine(cx, cy - s, cx, cy + Math.round(s * 0.7), c);
    drawLine(cx - Math.round(s * 0.5), cy - Math.round(s * 0.7), cx + Math.round(s * 0.5), cy - Math.round(s * 0.7), c);
    drawCircle(cx, cy - s, 2, c);
    drawLine(cx - Math.round(s * 0.7), cy + Math.round(s * 0.3), cx, cy + s, c);
    drawLine(cx + Math.round(s * 0.7), cy + Math.round(s * 0.3), cx, cy + s, c);
    drawLine(cx - Math.round(s * 0.8), cy + Math.round(s * 0.1), cx - Math.round(s * 0.5), cy + Math.round(s * 0.5), c);
    drawLine(cx + Math.round(s * 0.8), cy + Math.round(s * 0.1), cx + Math.round(s * 0.5), cy + Math.round(s * 0.5), c);
  },
  sun(cx, cy, s, c) {
    fillCircle(cx, cy, Math.round(s * 0.5), c);
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      drawLine(
        Math.round(cx + s * 0.65 * Math.cos(a)), Math.round(cy + s * 0.65 * Math.sin(a)),
        Math.round(cx + s * Math.cos(a)), Math.round(cy + s * Math.sin(a)), c,
      );
    }
  },
  barrel(cx, cy, s, c) {
    drawRect(cx - Math.round(s * 0.6), cy - s, Math.round(s * 1.2), s * 2, c, 1);
    drawLine(cx - Math.round(s * 0.6), cy - Math.round(s * 0.4), cx + Math.round(s * 0.6), cy - Math.round(s * 0.4), c);
    drawLine(cx - Math.round(s * 0.6), cy + Math.round(s * 0.4), cx + Math.round(s * 0.6), cy + Math.round(s * 0.4), c);
  },
  plane(cx, cy, s, c) {
    drawLine(cx - s, cy, cx + s, cy, c);
    fillTriangle(cx, cy - 2, cx + Math.round(s * 0.7), cy + 2, cx, cy + 2, c);
    drawLine(cx - Math.round(s * 0.3), cy, cx - Math.round(s * 0.6), cy - Math.round(s * 0.7), c);
    drawLine(cx + Math.round(s * 0.2), cy, cx + Math.round(s * 0.5), cy + Math.round(s * 0.7), c);
  },
  mask(cx, cy, s, c) {
    fillCircle(cx - Math.round(s * 0.3), cy, Math.round(s * 0.35), c);
    fillCircle(cx + Math.round(s * 0.3), cy, Math.round(s * 0.35), c);
    fillRect(cx - Math.round(s * 0.3), cy - Math.round(s * 0.35), Math.round(s * 0.6), 2, c);
  },
};

// ---------- the news: 42 stories, 7 regions, all date-checked for 21 Nov 2026 ----------
// R = reported fact, C = claim (not yet verified), F = forecast.
type Tag = 'R' | 'C' | 'F';
interface Story { icon: string; tag: Tag; head: string; sub: string; }
interface Region { name: string; color: RGB; stories: Story[]; }

const LEAD = {
  head: 'RUSSIA HITS KYIV - AND LANDS IN POLAND',
  summary:
    '400+ DRONES AND 110 MISSILES OVERNIGHT. 8 KILLED IN KYIV. TWO RUSSIAN MISSILES AND A SUSPECTED DRONE CAME DOWN IN EASTERN POLAND. NATO: GRAVE VIOLATION.',
  tag: 'R' as Tag,
};

const REGIONS: Region[] = [
  {
    name: 'EUROPE',
    color: BLUE,
    stories: [
      { icon: 'building', tag: 'R', head: 'UK-EU SIGN 3 DEALS', sub: 'FOOD, CARBON, YOUTH' },
      { icon: 'flag', tag: 'R', head: 'DENMARK EXPELS DIPLOMAT', sub: 'RUSSIAN, KILL PLOT' },
      { icon: 'globe', tag: 'R', head: 'COP31 OVERDUE', sub: 'NO FOSSIL-FUEL TEXT' },
      { icon: 'robot', tag: 'R', head: 'KILLER ROBOT RULES SET', sub: '128 NATIONS, BY 2028' },
      { icon: 'flag', tag: 'R', head: 'ESTONIA SHUTS BORDER', sub: 'WITH RUSSIA, DEC 1' },
      { icon: 'flame', tag: 'R', head: 'PROTESTS SPREAD IN EUROPE', sub: '6TH WEEKEND IN A ROW' },
    ],
  },
  {
    name: 'N. AMERICA',
    color: RED,
    stories: [
      { icon: 'chartDown', tag: 'R', head: 'MARKETS SLIDE INTO CORRECTION', sub: 'S&P -3.7%, NAS -5.3%' },
      { icon: 'shield', tag: 'R', head: 'FBI DATABASE HACKED', sub: 'CRIME DATA PROBED' },
      { icon: 'flame', tag: 'R', head: 'PALISADES ARSONIST CONVICTED', sub: '12 DEAD, 6,800 HOMES' },
      { icon: 'cross', tag: 'R', head: 'US LOSES MEASLES STATUS', sub: 'AFTER 26 YEARS' },
      { icon: 'star', tag: 'R', head: 'GTA VI MAKES $3.8BN', sub: 'IN ONE DAY, RECORD' },
      { icon: 'robot', tag: 'C', head: 'RIEMANN PROOF CLAIMED', sub: 'BY AI, UNVERIFIED' },
    ],
  },
  {
    name: 'LATAM',
    color: GREEN,
    stories: [
      { icon: 'shield', tag: 'R', head: 'CARTEL BOSS CAPTURED', sub: 'MEXICO, FBI WANTED' },
      { icon: 'bug', tag: 'R', head: 'MOSQUITOES CUT DENGUE 69%', sub: 'BRAZIL, WOLBACHIA' },
      { icon: 'cross', tag: 'R', head: 'BOLSONARO IN HOSPITAL', sub: 'BRAZIL EX-PRESIDENT' },
      { icon: 'shield', tag: 'R', head: 'HAITI GANG FIGHT', sub: '2,500 SALVADORANS' },
      { icon: 'chartDown', tag: 'R', head: 'ARGENTINA RISK TOPS 1,000', sub: 'BONDS FALL, LNG OK' },
      { icon: 'ball', tag: 'R', head: 'INFANTINO BACKED BY CONMEBOL', sub: 'FOR 2027 FIFA VOTE' },
    ],
  },
  {
    name: 'AFRICA',
    color: AMBER,
    stories: [
      { icon: 'ball', tag: 'R', head: 'SENEGAL FIRST TO QUALIFY', sub: 'AFCON 2027' },
      { icon: 'wave', tag: 'R', head: 'BOAT SINKS, 30 DEAD', sub: '300 MISSING, BAYELSA' },
      { icon: 'flag', tag: 'R', head: 'ETHIOPIA: 700,000 DISPLACED', sub: 'FIGHTING IN SOUTH' },
      { icon: 'scale', tag: 'R', head: 'LISSU CONVICTED', sub: 'SEDITION, TANZANIA' },
      { icon: 'cross', tag: 'R', head: 'UGANDA CURBS TRAVEL', sub: 'EBOLA, 34 DISTRICTS' },
      { icon: 'star', tag: 'R', head: 'MLAMBO DIES, 71', sub: 'SA DEPUTY PRESIDENT' },
    ],
  },
  {
    name: 'MIDDLE EAST',
    color: PURPLE,
    stories: [
      { icon: 'blast', tag: 'R', head: 'GAZA AID STRIKE KILLS 3', sub: 'CENTRAL KITCHEN' },
      { icon: 'blast', tag: 'R', head: 'HOUTHI STRIKES HIT SAUDI', sub: '71 STRIKES, 24 HOURS' },
      { icon: 'ship', tag: 'R', head: 'HORMUZ TANKERS HIT AGAIN', sub: '6 ATTACKS IN A WEEK' },
      { icon: 'flag', tag: 'R', head: 'TRUMP WEIGHS IRAN HIT', sub: 'ISRAEL PRESSES' },
      { icon: 'barrel', tag: 'R', head: 'SAUDI OIL DEAL WITH JAPAN', sub: '24M BARRELS IN JAPAN' },
      { icon: 'globe', tag: 'R', head: 'SPAIN BACKS GAZA MISSION', sub: 'UN, FRENCH PROPOSAL' },
    ],
  },
  {
    name: 'ASIA',
    color: TEAL,
    stories: [
      { icon: 'scale', tag: 'R', head: 'MYANMAR GUILTY OF GENOCIDE', sub: 'ICJ RULING, FIRST' },
      { icon: 'wave', tag: 'R', head: 'CYCLONE AKVAN HITS INDIA', sub: 'ANDHRA PRADESH COAST' },
      { icon: 'flame', tag: 'R', head: 'INDONESIA FIRES MAY COST $30BN', sub: 'EMISSIONS 3RD-HIGHEST' },
      { icon: 'flag', tag: 'R', head: 'MALAYSIA RESETTLES ROHINGYA', sub: '10,000 TO TURKIYE' },
      { icon: 'ship', tag: 'C', head: 'CHINA CLAIMS US SHIP OUT', sub: 'SCARBOROUGH SHOAL' },
      { icon: 'coin', tag: 'R', head: 'NSE IS WORLD NO. 5', sub: "INDIA'S STOCK MARKET" },
    ],
  },
  {
    name: 'OCEANIA',
    color: SLATE,
    stories: [
      { icon: 'rocket', tag: 'R', head: 'BEPICOLOMBO ORBITS MERCURY', sub: '8 YEARS, 10BN KM' },
      { icon: 'ball', tag: 'R', head: 'NORTH INTO AFLW FINAL', sub: '4TH STRAIGHT FINAL' },
      { icon: 'globe', tag: 'R', head: 'AUS, CANADA, NZ URGE PEACE', sub: 'JOINT APEC STATEMENT' },
      { icon: 'ball', tag: 'R', head: 'AUS INTO OCEANIA SEMIS', sub: 'BOWLS, NEW ZEALAND' },
      { icon: 'flag', tag: 'R', head: 'NZ SLAMS AUSSIE TURMOIL', sub: 'PETERS ON OPPOSITION' },
    ],
  },
];

function tagColor(t: Tag): RGB {
  return t === 'R' ? GREEN : t === 'C' ? AMBER : TEAL;
}
function fitTo(s: string, scale: number, maxW: number): string {
  const up = s.toUpperCase();
  let out = up;
  while (out.length > 0 && textWidth(out, scale) > maxW) out = out.slice(0, -1);
  return out;
}

// ---------- layout ----------
const MARGIN = 11;
const COL_W = 138;
const COL_GAP = 6;
const ROW_H = 110;
const ROW_GAP = 6;
const GRID_Y = 330;

function colX(i: number): number {
  return MARGIN + i * (COL_W + COL_GAP);
}
function rowY(j: number): number {
  return GRID_Y + j * (ROW_H + ROW_GAP);
}

function drawTag(x: number, y: number, t: Tag): void {
  const c = tagColor(t);
  fillRect(x, y, 14, 14, c);
  drawText(x + 4, y + 3, t, 1, CARD);
}

function drawStoryCard(x: number, y: number, region: Region, s: Story): void {
  fillRect(x, y, COL_W, ROW_H, CARD);
  drawRect(x, y, COL_W, ROW_H, RULE, 1);
  const iconFn = ICONS[s.icon] ?? ICONS['star']!;
  iconFn(x + 20, y + 22, 12, region.color);
  drawTag(x + COL_W - 18, y + 4, s.tag);
  const n = drawTextBlock(x + 8, y + 40, s.head, 2, COL_W - 16, 3, INK, 2);
  void n;
  const sub = fitTo(s.sub, 1, COL_W - 16);
  drawText(x + 8, y + ROW_H - 16, sub, 1, RULE);
}

function drawInfoCard(x: number, y: number): void {
  fillRect(x, y, COL_W, ROW_H, SOFT);
  drawRect(x, y, COL_W, ROW_H, RULE, 1);
  drawTextBlock(x + 8, y + 8, 'READ THIS PAGE', 2, COL_W - 16, 2, INK, 2);
  const lines = [
    'R = REPORTED FACT',
    'C = CLAIM, NOT YET',
    'VERIFIED',
    'F = FORECAST',
    'ALL 43 STORIES',
    'DATE-CHECKED FOR',
    '21 NOV 2026',
  ];
  let yy = y + 48;
  for (const ln of lines) {
    drawText(x + 8, yy, ln, 1, INK);
    yy += 9;
  }
}

function drawLeadArt(x0: number, y0: number, w: number, h: number): void {
  // Night sky over a city: stars, moon, skyline, one big blast, smoke, two flags.
  const stars: [number, number][] = [
    [18, 14], [52, 30], [96, 10], [140, 26], [180, 12], [224, 32], [260, 16],
    [300, 28], [330, 12], [40, 52], [120, 46], [210, 50], [290, 48],
  ];
  for (const [sx, sy] of stars) fillRect(x0 + sx, y0 + sy, 2, 2, CARD);
  fillCircle(x0 + 320, y0 + 22, 11, [232, 226, 212]);
  fillCircle(x0 + 316, y0 + 19, 9, SKY);
  // Blast: orange starburst with yellow core.
  const bx = x0 + 150;
  const by = y0 + 62;
  fillStar(bx, by, 30, ORANGE);
  fillStar(bx, by, 16, GOLD);
  fillCircle(bx, by, 7, [255, 236, 170]);
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 + 0.4;
    drawLine(
      Math.round(bx + 32 * Math.cos(a)), Math.round(by + 32 * Math.sin(a)),
      Math.round(bx + 46 * Math.cos(a)), Math.round(by + 46 * Math.sin(a)), ORANGE,
    );
  }
  // Smoke puffs.
  fillCircle(x0 + 96, y0 + 96, 12, SMOKE);
  fillCircle(x0 + 118, y0 + 88, 9, SMOKE);
  fillCircle(x0 + 205, y0 + 100, 11, SMOKE);
  fillCircle(x0 + 226, y0 + 90, 8, SMOKE);
  // Skyline silhouettes.
  const buildings: [number, number, number][] = [
    [0, 96, 34], [36, 70, 44], [82, 108, 30], [114, 80, 40], [156, 118, 36],
    [194, 84, 42], [238, 104, 32], [272, 72, 46], [320, 100, 40],
  ];
  for (const [bx2, bh, bw] of buildings) {
    fillRect(x0 + bx2, y0 + h - bh - 26, bw, bh + 26, [18, 28, 44]);
  }
  // Windows.
  for (let i = 0; i < 14; i++) {
    const wx = x0 + 8 + i * 24;
    const wy = y0 + h - 60 - ((i * 37) % 46);
    fillRect(wx, wy, 3, 4, GOLD);
  }
  // Flags at the foot: Ukraine (blue/yellow) and Poland (white/red).
  const fy = y0 + h - 22;
  drawLine(x0 + 20, fy - 16, x0 + 20, fy, CARD);
  fillRect(x0 + 20, fy - 16, 26, 8, [31, 90, 180]);
  fillRect(x0 + 20, fy - 8, 26, 8, [255, 213, 0]);
  drawLine(x0 + 60, fy - 16, x0 + 60, fy, CARD);
  fillRect(x0 + 60, fy - 16, 26, 8, CARD);
  fillRect(x0 + 60, fy - 8, 26, 8, RED);
  drawText(x0 + 96, fy - 12, 'KYIV - WARSAW', 1, CARD);
}

function main(): void {
  fillRect(0, 0, W, H, PAPER);
  // Masthead.
  fillRect(0, 0, W, 4, RED);
  drawTextCentered(0, 14, W, 'THE WORLD IN ONE DAY', 5, INK);
  drawTextCentered(0, 58, W, 'SATURDAY 21 NOVEMBER 2026', 3, RED);
  drawTextCentered(0, 84, W, '43 STORIES - 7 REGIONS - EVERY STORY DATE-CHECKED', 2, INK);
  fillRect(MARGIN, 100, W - 2 * MARGIN, 1, RULE);
  // Lead story panel.
  const LX = MARGIN;
  const LY = 104;
  const LW = W - 2 * MARGIN;
  const LH = 192;
  fillRect(LX, LY, LW, LH, SKY);
  fillRect(LX, LY, LW, 4, RED);
  drawLeadArt(LX, LY, 360, LH);
  drawText(LX + 384, LY + 16, 'LEAD STORY', 2, GOLD);
  drawTag(LX + LW - 118, LY + 14, LEAD.tag);
  drawText(LX + LW - 100, LY + 16, 'REPORTED', 2, CARD);
  drawTextBlock(LX + 384, LY + 40, LEAD.head, 4, LW - 384 - 24, 2, CARD, 4);
  drawTextBlock(LX + 384, LY + 112, LEAD.summary, 2, LW - 384 - 24, 4, [232, 226, 212], 3);
  // Region headers.
  for (let i = 0; i < REGIONS.length; i++) {
    const r = REGIONS[i]!;
    const x = colX(i);
    drawTextCentered(x, 304, COL_W, r.name, 2, r.color);
    fillRect(x, 322, COL_W, 3, r.color);
  }
  // Story grid.
  for (let i = 0; i < REGIONS.length; i++) {
    const r = REGIONS[i]!;
    for (let j = 0; j < 6; j++) {
      const x = colX(i);
      const y = rowY(j);
      const s = r.stories[j];
      if (s) {
        drawStoryCard(x, y, r, s);
      } else {
        drawInfoCard(x, y);
      }
    }
  }
  // Footer rule.
  fillRect(MARGIN, H - 4, W - 2 * MARGIN, 1, RULE);
  const png = encodePNG(px, W, H);
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, 'entry.png'), png);
}

main();
