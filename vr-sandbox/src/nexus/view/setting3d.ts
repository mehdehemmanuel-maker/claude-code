// WHICH LAWS ARE ON, and the room derived from that rather than drawn (the law itself: src/nexus/substrate/place.ts).
//
// The user, 2026-10-16: "it should just be in the air unless time and gravity apply then it when those are on it would
// start being g active or effected by environment". So a floor, a grid, a pedestal, a parts bay are not scenery to
// draw: each is a CONSEQUENCE of gravity being on. With nothing switched on the room is blank and what you build
// hangs in the air where it was put, every quantity attached to it and no law acting on it. A table presupposes
// gravity and contact; a bench presupposes a floor; a building presupposes both. None of them is implied by anything
// until gravity is switched on, and the substrate decides that by arithmetic (a weight of 0 N is borne by nothing),
// never by a view file's taste.
//
// This owns the room's SETTING and nothing else: which laws are on, what the room's own furniture rests on, and the
// words that switch a law. What is drawn stays in `forge.ts`, which registers each piece here as it makes it. It is
// its own file because forge.ts is already five concerns and this is a sixth.

import type * as THREE from 'three';
import { BLANK, borne, EARTH, impliedRoom, switched, type Setting } from '../substrate/place';

/** What a piece of the room rests on. `gravity`: a surface that bears something, so it exists wherever a weight has
 *  to be borne and nowhere else. `nothing`: a fixture resting on no law at all (a robot, a warehouse, a workshop
 *  corner, a diagram), which a blank setting therefore does not have — it comes back only when asked for by name. */
export type RestsOn = 'gravity' | 'nothing';

/** Where a thing hangs when nothing holds it: in front of you at chest height, as you would hold it to look at it. */
export const HOVER = 1.15;

export interface RoomSetting {
  /** Register a piece of the room as it is made, and get it back so the call can be inlined into `scene.add`. */
  piece<T extends THREE.Object3D>(obj: T, restsOn: RestsOn): T;
  /** Put the room in the state the setting implies. Call it after anything changes what is in the room. */
  apply(): void;
  /** A fixture asked for by name is in the room while you are at it, and nowhere else; null puts them all away. */
  askFor(obj: THREE.Object3D | null): void;
  /** Which laws are on right now. */
  now(): Setting;
  /** What the setting is and what it implies, in the substrate's own sentences rather than this file's. */
  says(): string;
  /** "gravity on", "time off", "what's on" — switch a law and the room follows, or report. Null if not about this. */
  heard(text: string): string | null;
}

/**
 * The room's setting, over the pieces `forge.ts` registers with it.
 * `start` is what the query asked for; `onGround`/`inTheAir` move what you built as gravity comes and goes;
 * `massNow` is what is in the room in kg, so switching gravity on can say what it now weighs; `alsoApply` carries
 * the change anywhere else that needs it (the people's own gravity).
 */
export function roomSetting(o: {
  start: Setting;
  stand(onGround: boolean): void;
  massNow(): number;
  alsoApply(s: Setting): void;
}): RoomSetting {
  const furniture: { obj: THREE.Object3D; restsOn: RestsOn }[] = [];
  let setting = o.start, askedFor: THREE.Object3D | null = null;
  /** What one piece's visibility should be right now. A piece takes this AS IT REGISTERS, not only when `apply` is
   *  next called: most of the room (the robot, the warehouse, the workshop) is built hundreds of lines after the
   *  setting is made, so a piece that waited for the next `apply` would simply stay as it was drawn. That was a real
   *  fault — the room read blank from the front and still had the whole warehouse behind you. */
  const shows = (f: { obj: THREE.Object3D; restsOn: RestsOn }) => (f.restsOn === 'gravity' ? setting.gravity > 0 : f.obj === askedFor);
  const apply = () => {
    for (const f of furniture) f.obj.visible = shows(f);
    o.stand(setting.gravity > 0);
  };
  const says = () => {
    const rows = impliedRoom(setting).map((r) => `${r.law} is ${r.on ? 'on' : 'off'} — ${r.room}`);
    return `${rows.join(' ')} ${setting.gravity > 0
      ? 'Say "gravity off" and the ground goes with it.'
      : 'Say "gravity on" and a ground appears under what you have built, because a weight has to be borne by something; say "time on" and what is not in balance moves.'}`;
  };
  return {
    piece: (obj, restsOn) => { const f = { obj: obj as THREE.Object3D, restsOn }; furniture.push(f); obj.visible = shows(f); return obj; },
    apply,
    askFor: (obj) => { askedFor = obj; apply(); },
    now: () => setting,
    says,
    heard(text) {
      const t = text.trim().toLowerCase().replace(/[.!?]+$/, '');
      const m = /^(?:switch |turn )?(time|gravity) (on|off)$|^(on|off) with (?:the )?(time|gravity)$/.exec(t);
      if (m) {
        const law = (m[1] ?? m[4]) as 'time' | 'gravity', on = (m[2] ?? m[3]) === 'on';
        setting = switched(setting, law, on); apply(); o.alsoApply(setting);
        const kg = o.massNow();
        return `${law.replace(/^./, (c) => c.toUpperCase())} is ${on ? 'on' : 'off'}. ${kg > 0 ? `${borne(setting, kg).says} ` : ''}${says()}`;
      }
      if (/^(what(?:'s| is)? (?:on|the setting)|setting|which laws are on|is gravity on)$/.test(t)) return says();
      return null;
    },
  };
}

/** WHERE YOU STAND TO SEE THE ROOM. A room judged from one angle is not judged: the front hides what is behind you
 *  and beside you, which is how a room reads as blank from the front while a robot and a workshop stand in it. Each
 *  entry is a camera position then what it looks at. `?view=` picks one. */
export const VIEWS: Record<string, [number, number, number, number, number, number]> = {
  front: [0, 1.6, 0.45, 0, 1.3, -1.3],
  close: [0.25, 1.25, -0.35, 0, 0.85, -1.25],
  side: [1.2, 1.35, -0.2, 0, 0.9, -1.3],
  pipeline: [0, 1.75, 0.3, 0, 1.95, -1.6],
  wide: [0, 2.0, 1.9, 0, 1.2, -1.2],
  back: [0, 1.6, 0.2, 0, 1.4, 3.0],
  left: [-2.2, 1.5, -0.4, 0, 1.1, -1.2],
  above: [0, 5.5, 0.1, 0, 0.6, -1.2],
};
/** The one the query asked for, the front by default. */
export const viewAsked = (params: URLSearchParams): [number, number, number, number, number, number] =>
  VIEWS[params.get('view') ?? 'front'] ?? VIEWS.front!;

/** What the query asked the room to start as: blank unless it says otherwise. */
export const startingSetting = (params: URLSearchParams): Setting =>
  params.get('gravity') === 'on' || params.get('setting') === 'earth' ? EARTH : BLANK;
