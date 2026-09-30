// Item icons for the tablet, drawn like an inventory: every part as a small isometric object in its default
// material's colour, every material as a block of itself, joints and tools by their glyph. Pure canvas drawing, no
// images to load.

import { getMaterial, type Material } from '../data/materials';
import { getPartKind } from '../parts/registry';

export type ItemType = 'tool' | 'part' | 'material' | 'joint' | 'build' | 'action';
export interface Item { type: ItemType; id: string }

const COS = Math.cos(Math.PI / 6), SIN = 0.5;

const hex = (c: number) => `#${c.toString(16).padStart(6, '0')}`;
function shade(c: number, k: number) {
  const r = Math.min(255, Math.round(((c >> 16) & 255) * k)), g = Math.min(255, Math.round(((c >> 8) & 255) * k)), b = Math.min(255, Math.round((c & 255) * k));
  return `rgb(${r},${g},${b})`;
}

/** An isometric box: sx along the lower right, sz along the lower left, sy up; (cx, cy) is its bottom centre. */
function isoBox(g: CanvasRenderingContext2D, cx: number, cy: number, sx: number, sy: number, sz: number, c: number, m?: Material) {
  const P = (x: number, y: number, z: number): [number, number] => [cx + (x - z) * COS, cy + (x + z) * SIN - y];
  const hx = sx / 2, hz = sz / 2;
  const face = (pts: [number, number, number][], fill: string) => {
    g.beginPath();
    pts.forEach((p, i) => { const [x, y] = P(...p); if (i) g.lineTo(x, y); else g.moveTo(x, y); });
    g.closePath();
    g.fillStyle = fill;
    g.fill();
  };
  face([[-hx, sy, -hz], [hx, sy, -hz], [hx, sy, hz], [-hx, sy, hz]], shade(c, 1.25));
  face([[-hx, 0, hz], [hx, 0, hz], [hx, sy, hz], [-hx, sy, hz]], shade(c, 0.9));
  face([[hx, 0, -hz], [hx, 0, hz], [hx, sy, hz], [hx, sy, -hz]], shade(c, 0.65));
  if (m) surface(g, P, hx, sy, hz, m);
}

/** A hint of the material: grain on wood, flecks on stone and cork, a glint on metal. */
function surface(g: CanvasRenderingContext2D, P: (x: number, y: number, z: number) => [number, number], hx: number, sy: number, hz: number, m: Material) {
  g.save();
  if (m.category === 'wood' || m.category === 'engineered-wood') {
    g.strokeStyle = 'rgba(60,35,15,0.35)';
    g.lineWidth = 1.5;
    for (let k = 1; k < 4; k++) {
      const z = -hz + (2 * hz * k) / 4;
      g.beginPath();
      const [x0, y0] = P(-hx, sy, z), [x1, y1] = P(hx, sy, z);
      g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    }
  } else if (m.category === 'stone' || m.category === 'cork' || m.category === 'ceramic') {
    g.fillStyle = 'rgba(0,0,0,0.25)';
    for (let k = 0; k < 9; k++) {
      const [x, y] = P(-hx + ((k * 37) % 17) / 17 * 2 * hx, sy, -hz + ((k * 53) % 13) / 13 * 2 * hz);
      g.fillRect(x, y, 2, 2);
    }
  } else if (m.metalness > 0.5) {
    const [x0, y0] = P(-hx * 0.6, sy, -hz * 0.2), [x1, y1] = P(hx * 0.2, sy, hz * 0.6);
    g.strokeStyle = 'rgba(255,255,255,0.55)';
    g.lineWidth = 2;
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
  }
  g.restore();
}

/** An upright isometric cylinder (radius r, height h) standing at (cx, cy). */
function isoCylinder(g: CanvasRenderingContext2D, cx: number, cy: number, r: number, h: number, c: number, band?: number, top?: number) {
  const ry = r * SIN * 1.15;
  g.fillStyle = shade(c, 0.8);
  g.beginPath();
  g.ellipse(cx, cy, r, ry, 0, 0, Math.PI);
  g.lineTo(cx - r, cy - h);
  g.ellipse(cx, cy - h, r, ry, 0, Math.PI, 0, true);
  g.closePath();
  g.fill();
  if (band !== undefined) {
    g.fillStyle = hex(band);
    g.fillRect(cx - r, cy - h * 0.75, 2 * r, h * 0.45);
  }
  g.fillStyle = top !== undefined ? hex(top) : shade(c, 1.2);
  g.beginPath();
  g.ellipse(cx, cy - h, r, ry, 0, 0, Math.PI * 2);
  g.fill();
}

function ball(g: CanvasRenderingContext2D, cx: number, cy: number, r: number, c: number) {
  const grad = g.createRadialGradient(cx - r * 0.35, cy - r * 0.35, r * 0.1, cx, cy, r);
  grad.addColorStop(0, shade(c, 1.5));
  grad.addColorStop(1, shade(c, 0.6));
  g.fillStyle = grad;
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.fill();
}

/** A part kind's icon, centred in a square of `s` pixels at (x, y). */
export function drawPart(g: CanvasRenderingContext2D, kindId: string, x: number, y: number, s: number, material?: string) {
  const kind = getPartKind(kindId);
  const m = getMaterial(material ?? kind.defaultMaterial);
  const c = m.color, cx = x + s / 2, cy = y + s * 0.78, u = s * 0.34;
  switch (kindId) {
    case 'block': isoBox(g, cx, cy, u * 1.3, u * 1.3, u * 1.3, c, m); break;
    case 'plate': isoBox(g, cx, cy - u * 0.3, u * 2, u * 0.18, u * 1.4, c, m); break;
    case 'lumber': isoBox(g, cx, cy - u * 0.3, u * 2.4, u * 0.35, u * 0.6, c, m); break;
    case 'rod.square': isoBox(g, cx, cy - u * 0.3, u * 2.4, u * 0.3, u * 0.3, c, m); break;
    case 'beam.i':
      isoBox(g, cx, cy - u * 0.3, u * 2.4, u * 0.12, u * 0.8, c, m);
      isoBox(g, cx, cy - u * 0.42, u * 2.4, u * 0.6, u * 0.14, c);
      isoBox(g, cx, cy - u * 1.02, u * 2.4, u * 0.12, u * 0.8, c, m);
      break;
    case 'angle':
      isoBox(g, cx, cy - u * 0.3, u * 2.4, u * 0.14, u * 0.7, c, m);
      isoBox(g, cx + u * 0.3 * COS, cy - u * 0.3 + u * 0.3 * SIN, u * 2.4, u * 0.7, u * 0.14, c);
      break;
    case 'rod.round': case 'tube.round': case 'tube.square': {
      g.save();
      g.translate(cx, cy - u * 0.4);
      g.rotate(-Math.PI / 6);
      const r = kindId === 'rod.round' ? u * 0.22 : u * 0.34;
      g.fillStyle = shade(c, 0.85);
      g.fillRect(-u * 1.2, -r, u * 2.4, 2 * r);
      g.fillStyle = shade(c, 1.2);
      g.fillRect(-u * 1.2, -r, u * 2.4, r * 0.5);
      if (kindId !== 'rod.round') { g.fillStyle = '#1e2126'; g.beginPath(); g.ellipse(u * 1.2, 0, r * 0.35, r * 0.6, 0, 0, Math.PI * 2); g.fill(); }
      g.restore();
      break;
    }
    case 'disc': isoCylinder(g, cx, cy - u * 0.2, u * 0.95, u * 0.25, c); break;
    case 'wheel': isoCylinder(g, cx, cy - u * 0.2, u * 0.95, u * 0.5, 0x2a2d31, undefined, 0x3b3f45); break;
    case 'sphere': ball(g, cx, cy - u * 0.8, u * 0.85, c); break;
    case 'weight': isoCylinder(g, cx, cy - u * 0.1, u * 0.7, u * 1.1, 0x4a4f55, undefined, 0x6a7078); break;
    case 'wedge': {
      g.fillStyle = shade(c, 0.9);
      g.beginPath(); g.moveTo(cx - u * 1.2, cy - u * 0.2); g.lineTo(cx + u * 1.2, cy - u * 0.2); g.lineTo(cx + u * 1.2, cy - u * 1.4); g.closePath(); g.fill();
      break;
    }
    case 'magnet.disc': isoCylinder(g, cx, cy - u * 0.2, u * 0.8, u * 0.55, c, undefined, 0xc23b22); break;
    case 'magnet.block': isoBox(g, cx, cy, u * 1.6, u * 0.6, u * 0.9, c); { const [tx, ty] = [cx, cy - u * 0.6 - u * 0.1]; g.fillStyle = '#c23b22'; g.fillRect(tx - u * 0.5, ty - 3, u, 6); } break;
    case 'magnet.electro': isoCylinder(g, cx, cy - u * 0.1, u * 0.8, u * 1.1, 0x8f959c, 0xb87333, 0xc23b22); break;
    default: isoBox(g, cx, cy, u * 1.2, u * 1.2, u * 1.2, c, m);
  }
}

/** A material as a block of itself. */
export function drawMaterial(g: CanvasRenderingContext2D, id: string, x: number, y: number, s: number) {
  const m = getMaterial(id);
  const u = s * 0.44;
  isoBox(g, x + s / 2, y + s * 0.86, u, u, u, m.color, m);
}

const JOINT_GLYPHS: Record<string, string> = {
  auto: '✨', weld: '🔥', bolted: '🔩', screwed: '🪛', nailed: '📌', riveted: '⚙️', glued: '💧', soldered: '〰️', fixed: '🔒',
  hinge: '🚪', bearing: '⭕', slider: '↔️', ball: '🔘', spring: '〽️', rope: '🪢', band: '➰', motor: '⚡', servo: '🎛️', 'eddy-brake': '🧲',
};

export function drawGlyph(g: CanvasRenderingContext2D, glyph: string, x: number, y: number, s: number) {
  g.font = `${Math.round(s * 0.55)}px system-ui, "Noto Color Emoji", sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = '#e8ecf1';
  g.fillText(glyph, x + s / 2, y + s * 0.52);
  g.textBaseline = 'alphabetic';
}

export const jointGlyph = (id: string) => JOINT_GLYPHS[id] ?? '🔗';
