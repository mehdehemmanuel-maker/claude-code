// Holographic text for the room: words drawn on a canvas and shown on a sprite (always facing the eye) or on a panel
// (a plane that faces where it is turned). Sizes are in metres; a panel's lines wrap to its width.

import * as THREE from 'three';

const FONT = 'system-ui, -apple-system, Segoe UI, sans-serif';

/** A label on a sprite: height in metres per line. */
export function label(text: string, height = 0.03, color = '#e6f7ff', bg = 'rgba(4,16,24,0.7)'): THREE.Sprite {
  const pad = 14, font = 44, lines = text.split('\n');
  const c = document.createElement('canvas'), g = c.getContext('2d')!;
  g.font = `500 ${font}px ${FONT}`;
  c.width = Math.ceil(Math.max(...lines.map((l) => g.measureText(l).width)) + pad * 2);
  c.height = Math.ceil(lines.length * font * 1.25 + pad * 2);
  g.font = `500 ${font}px ${FONT}`;
  g.fillStyle = bg; g.beginPath(); g.roundRect(0, 0, c.width, c.height, 16); g.fill();
  g.fillStyle = color; g.textBaseline = 'top';
  lines.forEach((l, i) => g.fillText(l, pad, pad + i * font * 1.25));
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  const h = height * lines.length * 1.25;
  s.scale.set((h * c.width) / c.height, h, 1);
  s.renderOrder = 20;
  return s;
}

export interface Card { mesh: THREE.Mesh; draw: (title: string, lines: { text: string; color?: string; size?: number }[], accent?: string) => void }

/** A panel of wrapped lines, `w` metres wide, redrawn in place: a holographic card with a frame and a title. */
export function card(w: number, h: number, px = 1024): Card {
  const c = document.createElement('canvas'); c.width = px; c.height = Math.round((px * h) / w);
  const g = c.getContext('2d')!;
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
  mesh.renderOrder = 15;
  const draw: Card['draw'] = (title, lines, accent = '#4dd0e1') => {
    mesh.userData.title = title;
    g.clearRect(0, 0, c.width, c.height);
    g.fillStyle = 'rgba(3,14,22,0.78)'; g.beginPath(); g.roundRect(4, 4, c.width - 8, c.height - 8, 22); g.fill();
    g.strokeStyle = accent; g.lineWidth = 3; g.globalAlpha = 0.9; g.beginPath(); g.roundRect(4, 4, c.width - 8, c.height - 8, 22); g.stroke(); g.globalAlpha = 1;
    // corner brackets
    g.lineWidth = 6; for (const [x, y, dx, dy] of [[14, 14, 1, 1], [c.width - 14, 14, -1, 1], [14, c.height - 14, 1, -1], [c.width - 14, c.height - 14, -1, -1]] as const) { g.beginPath(); g.moveTo(x + dx * 40, y); g.lineTo(x, y); g.lineTo(x, y + dy * 40); g.stroke(); }
    const unit = c.width / 34;
    g.fillStyle = accent; g.font = `600 ${unit * 1.15}px ${FONT}`; g.textBaseline = 'top';
    let y = unit * 1.1;
    for (const l of wrap(g, title, c.width - unit * 2.4)) { g.fillText(l, unit * 1.2, y); y += unit * 1.4; }
    y += unit * 0.4;
    for (const line of lines) {
      const size = unit * (line.size ?? 0.85);
      g.font = `400 ${size}px ${FONT}`; g.fillStyle = line.color ?? '#d9f3ff';
      for (const l of wrap(g, line.text, c.width - unit * 2.4)) { if (y > c.height - unit) break; g.fillText(l, unit * 1.2, y); y += size * 1.3; }
      y += size * 0.25;
    }
    tex.needsUpdate = true;
  };
  return { mesh, draw };
}

function wrap(g: CanvasRenderingContext2D, text: string, width: number): string[] {
  const out: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (g.measureText(next).width > width && line) { out.push(line); line = word; } else line = next;
  }
  if (line) out.push(line);
  return out;
}
