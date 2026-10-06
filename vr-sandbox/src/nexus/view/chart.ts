// A chart in the room: what a run, a fall or a flow of heat did over time, drawn on a panel. One quantity to a panel
// (small multiples, never two scales on one axis); thin lines, a quiet grid, the series named at their ends and in a
// legend where there are two or more, the words in text colours (never the series' own). The series colours are the
// reference palette's dark steps, checked against this panel's surface (#06141d) with the dataviz validator: every
// adjacent pair clear for colour-blind and normal vision, each at 3:1 or more against the surface.

import * as THREE from 'three';
import type { Chart } from '../generate';

const FONT = 'system-ui, -apple-system, Segoe UI, sans-serif';
const SERIES = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'];
const INK = '#ffffff', INK2 = '#c3c2b7', GRID = 'rgba(195,194,183,0.16)', SURFACE = 'rgba(6,20,29,0.92)';

/** Steps for an axis: 1, 2 or 5 times a power of ten, about four of them over the range. */
function ticks(lo: number, hi: number): number[] {
  if (!(hi > lo)) hi = lo + 1;
  const raw = (hi - lo) / 4, p = 10 ** Math.floor(Math.log10(raw)), step = [1, 2, 5, 10].map((k) => k * p).find((s) => s >= raw)!;
  const out: number[] = []; for (let v = Math.floor(lo / step) * step; v <= hi + step * 1e-9; v += step) out.push(+v.toPrecision(12)); return out;
}
/** The words cut to what fits in so many pixels, with an ellipsis where they were cut. */
function fit(g: CanvasRenderingContext2D, s: string, px: number): string {
  if (g.measureText(s).width <= px) return s;
  let n = s.length; while (n > 1 && g.measureText(`${s.slice(0, n)}…`).width > px) n--; return `${s.slice(0, n).trimEnd()}…`;
}
const fmt = (v: number) => (Math.abs(v) >= 1e4 || (Math.abs(v) < 1e-2 && v !== 0) ? v.toExponential(1) : String(+v.toPrecision(4)));

export interface ChartPanel { mesh: THREE.Mesh; draw: (c: Chart) => void }
/** A chart panel w metres wide; redrawn in place for each chart. */
export function chartPanel(w = 0.9, h = 0.72): ChartPanel {
  const cv = document.createElement('canvas'); cv.width = 1600; cv.height = Math.round((1600 * h) / w);
  const g = cv.getContext('2d')!, tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false, side: THREE.DoubleSide }));
  mesh.renderOrder = 15;
  const draw = (c: Chart) => {
    const W = cv.width, H = cv.height;
    g.clearRect(0, 0, W, H); g.fillStyle = SURFACE; g.beginPath(); g.roundRect(4, 4, W - 8, H - 8, 22); g.fill();
    g.strokeStyle = 'rgba(77,208,225,0.6)'; g.lineWidth = 3; g.stroke();
    g.textBaseline = 'alphabetic'; g.fillStyle = INK; g.font = `600 46px ${FONT}`; g.fillText(fit(g, c.title, W - 88), 44, 70);
    g.fillStyle = INK2; g.font = `400 28px ${FONT}`; g.fillText(fit(g, c.note, W - 88), 44, 110);
    const top = 140, gap = 26, ph = (H - top - 40 - gap * (c.panels.length - 1)) / c.panels.length, left = 150, right = W - 300;
    c.panels.forEach((p, k) => {
      const y0 = top + k * (ph + gap), y1 = y0 + ph - 46, all = p.series.flatMap((s) => s.v).filter(Number.isFinite), ts = p.series.flatMap((s) => s.t);
      let lo = Math.min(...all), hi = Math.max(...all); if (hi - lo < 1e-9) { lo -= 1; hi += 1; }
      const yt = ticks(lo, hi), ylo = Math.min(lo, yt[0]!), yhi = Math.max(hi, yt.at(-1)!), t0 = Math.min(...ts), t1 = Math.max(...ts) || 1;
      const X = (t: number) => left + ((t - t0) / (t1 - t0 || 1)) * (right - left), Y = (v: number) => y1 - ((v - ylo) / (yhi - ylo)) * (y1 - y0 - 30);
      // what it measures, then its quiet grid and axis
      g.fillStyle = INK; g.font = `600 30px ${FONT}`; g.fillText(p.label, left, y0 + 22);
      g.font = `400 24px ${FONT}`; g.textAlign = 'right';
      for (const v of yt) { const y = Y(v); if (y < y0 + 26) continue; g.strokeStyle = GRID; g.lineWidth = 2; g.beginPath(); g.moveTo(left, y); g.lineTo(right, y); g.stroke(); g.fillStyle = INK2; g.fillText(fmt(v), left - 14, y + 8); }
      g.textAlign = 'center'; for (const t of ticks(t0, t1)) { if (t < t0 - 1e-9 || t > t1 + 1e-9) continue; g.fillStyle = INK2; g.fillText(`${fmt(t)} s`, X(t), y1 + 34); }
      g.textAlign = 'left';
      // each series, its line in its own colour, its name and last value at its end in text colours
      const ends: { y: number; s: (typeof p.series)[number]; col: string }[] = [];
      p.series.forEach((s, i) => {
        const col = SERIES[i % SERIES.length]!; g.strokeStyle = col; g.lineWidth = 4; g.lineJoin = 'round'; g.beginPath();
        s.t.forEach((t, j) => { const x = X(t), y = Y(s.v[j]!); if (j) g.lineTo(x, y); else g.moveTo(x, y); }); g.stroke();
        ends.push({ y: Y(s.v.at(-1)!), s, col });
      });
      ends.sort((a, b) => a.y - b.y); for (let i = 1; i < ends.length; i++) if (ends[i]!.y - ends[i - 1]!.y < 30) ends[i]!.y = ends[i - 1]!.y + 30;
      for (const e of ends) { g.fillStyle = e.col; g.beginPath(); g.arc(right + 18, e.y - 8, 8, 0, Math.PI * 2); g.fill(); g.fillStyle = INK; g.font = `500 24px ${FONT}`; g.fillText(fit(g, `${e.s.name} ${fmt(e.s.v.at(-1)!)}${p.unit ? ` ${p.unit}` : ''}`, W - right - 54), right + 34, e.y); }
    });
    tex.needsUpdate = true; mesh.userData.title = c.title;
  };
  return { mesh, draw };
}
