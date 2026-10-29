// How a part looks, as layers anyone can change (docs/REALITY.md phase 3.4): an auto texture to start from, every layer
// editable. The substrate is its material, coloured by its own optics (colour.ts: a metal's measured n + i k through
// Fresnel and the eye); a treatment grows a film on it (anodised, oxidised, heat tinted: its colour by interference); a
// coating covers it (paint by its colour, metal flake in it, a clear coat over it); wear takes the coat off. Each layer
// is data on the part or on the override that places it; the renderer resolves it against each piece's own material,
// so one look on an assembly gives a steel bolt and an aluminium bracket each its own colour.

import { filmColour, metalColour } from './colour';

/** A coating over the part. */
export interface Coat {
  /** a paint's colour (sRGB hex), chosen: a design; blank, a clear lacquer over the bare surface */ colour?: number;
  /** metal flakes in the paint, the share of its face they cover (0 solid, about 0.3 to 0.6 a metallic) */ flake: number;
  /** a clear coat over it, 0 to 1 (a glossy layer of n about 1.5: about 4 % of the light reflected square on, Fresnel) */ clear: number;
  /** the paint's own roughness under any clear coat, 0 a mirror to 1 chalk */ rough: number;
}
/** The layers, bottom up. */
export interface Look {
  /** the substrate's colour worked out from its material (true), or the colour the part already carries */ auto: boolean;
  /** a film grown on it: an oxide or an anodic layer, its thickness (nm) */ film?: { film: string; d: number };
  coat?: Coat;
  /** how worn, 0 new to 1 derelict: the coat goes first at its edges, the bare metal under it rusts or dulls */ wear?: number;
}

/** A material as the metal whose optics are measured: a plain or alloy steel's are iron's (it is about 98 % iron; its
 *  carbides and other elements change its colour little: an approximation, said); an aluminium alloy's aluminium's;
 *  a nickel plate's nickel's. Stainless (Fe-Cr-Ni with its chromium oxide film), brass and bronze have no measured
 *  data here: they keep the colour they carry. */
export function metalOf(mat: string | undefined): string | undefined {
  const m = mat ?? '';
  if (/^(steel-|mls-steel|cast-iron)/.test(m)) return 'iron';
  if (/^al-\d|^al-a\d/.test(m)) return 'aluminium';
  if (/^(copper|magnet-wire)$/.test(m)) return 'copper';
  if (/^nickel-/.test(m)) return 'nickel';
  return ['gold', 'lead', 'tungsten', 'titanium', 'silver', 'platinum', 'zinc', 'chromium', 'cobalt', 'palladium'].includes(m) ? m : undefined;
}

export interface Resolved { color: number; metal: number; rough?: number; clear: number; flake: number; says: string }
const cache = new Map<string, Resolved>();
/** A look on a piece of a material carrying a colour, resolved into what a renderer draws: its colour (linear values
 *  encoded as sRGB hex), how metallic, any roughness the coat sets, its clear coat and flake. */
export function resolveLook(look: Look, mat: string | undefined, given: number): Resolved {
  const key = `${JSON.stringify(look)}|${mat}|${given}`, was = cache.get(key); if (was) return was;
  const metal = metalOf(mat), says: string[] = [];
  let color = given, metallic = metal ? 1 : 0;
  if (look.auto && metal) { color = metalColour(metal)!.hex; says.push(`its colour from ${metal}'s own optics (${mat})`); }
  else if (look.auto) says.push(`no optics measured for ${mat ?? 'its material'} here: its own colour kept`);
  if (look.film && metal) { const c = filmColour(metal, look.film.film, look.film.d); color = c.hex; says.push(`a ${look.film.d.toFixed(0)} nm film of ${look.film.film} on it, its colour by interference`); }
  else if (look.film) says.push(`a film needs a metal under it with measured optics: none for ${mat}`);
  const c = look.coat; let rough: number | undefined, clear = 0, flake = 0;
  if (c) {
    if (c.colour !== undefined) { color = c.colour; metallic = c.flake; flake = c.flake; rough = c.rough; says.push(c.flake > 0 ? `painted, ${(c.flake * 100).toFixed(0)} % metal flake` : 'painted, solid'); }
    else says.push('lacquered clear');
    clear = c.clear; if (c.clear > 0) says.push('a clear coat over it: about 4 % of the light mirrored from its top (n 1.5, Fresnel), the colour seen through it');
  }
  if (look.wear) says.push(`worn ${(look.wear * 100).toFixed(0)} %: duller and dirtier${c ? ', its clear coat going' : metal === 'iron' ? ', rusting' : ''}`);
  const r = { color, metal: metallic, ...(rough !== undefined ? { rough } : {}), clear, flake, says: says.join('; ') };
  cache.set(key, r); return r;
}
