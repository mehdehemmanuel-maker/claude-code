// Setting a bench out in the room: where it stands, and the words that open it.
//
// WHY THIS FILE EXISTS. `view/forge.ts` carries a size ratchet whose note names its five concerns — "the room, the
// asking, the phone, the benches and the pipeline player" — and says the benches have moved out while "the rest"
// has not. The rest is this: the twenty-odd lines that put a bench in front of a person, point the camera at it and
// return what to say. Adding a third bench (the gear bench) pushed the room past its allowance, and the honest way
// through a ratchet is the split it is asking for, never a bigger number. So the mounting lives here, each bench
// still owning its own height, reach and vocabulary (`SolderBench.setOut`/`greeting`, `GearBench.setOut`/`greeting`).
import * as THREE from 'three';
import { GearBench } from './gear-bench';
import { SolderBench } from './solder-bench';

/** The parts of the room a bench needs to be set out in it, and nothing else. */
export interface Room {
  scene: THREE.Object3D; camera: THREE.PerspectiveCamera;
  orbit: { target: THREE.Vector3; update(): void };
  inVR: boolean;
  /** where the person's eyes are, and where they are looking */ eye(): THREE.Vector3; forward(): THREE.Vector3;
  named(o: THREE.Object3D, name: string): void;
}

/** A bench knows its own working height and how far in front of a person it belongs; this only asks it, and moves
 *  the camera to it when there is no headset to do that by walking. */
export function stand(b: { setOut(eye: THREE.Vector3, f: THREE.Vector3): { eye: THREE.Vector3; at: THREE.Vector3 } }, room: Room): void {
  const v = b.setOut(room.eye(), room.forward());
  if (!room.inVR) { room.camera.position.copy(v.eye); room.orbit.target.copy(v.at); room.orbit.update(); }
}

// THE GEAR BENCH AND WHETHER IT IS OUT. The one that is out lives here rather than in the room, because the room
// holding a variable per bench is how it came to be five concerns in the first place. The room asks `gearBench()`
// when a hand closes or a frame passes, and that is its whole part in it.
let gears: GearBench | null = null;
/** The gear bench that is out, if one is. */
export const gearBench = (): GearBench | null => gears;

/** Set out a plate of shaft holes and gears that mesh because of where they are put. */
export function openGears(room: Room, m = 0.002): string {
  if (gears) return `The gear bench is already out. ${gears.say()[0]}`;
  gears = new GearBench(m);
  room.scene.add(gears.group); room.named(gears.group, 'the gear bench');
  stand(gears, room);
  return gears.greeting(room.inVR);
}

/** WHAT A BENCH THAT IS OUT HEARS FIRST. "put a 20 on at 0,0" is a gear on a plate, but the room's generic shape
 *  placer matched it first and answered 'I do not know the shape "a"', so the gear bench's words were unreachable
 *  in the room — which only showed when the bench was driven rather than built and photographed. A bench that is
 *  out owns its own vocabulary, and the room asks here before it asks anything else. */
export const benchHeard = (text: string): string | null => gears?.act(text.trim()) ?? null;

/** Put it away, if the words ask for that. */
export function closeGears(room: Room, t: string): string | null {
  if (!gears || !/^(close|put away|clear) (the )?gear(s| bench)?/.test(t)) return null;
  gears.dispose(); room.scene.remove(gears.group); gears = null;
  return 'The gear bench put away.';
}

/** The soldering bench, set out, with what is on it and the first step to do. */
export function openSolder(bench: SolderBench, room: Room, parts?: string, steps = 0, first = ''): string {
  room.scene.add(bench.group); room.named(bench.group, 'the soldering bench');
  stand(bench, room);
  return bench.greeting(room.inVR, steps, first, parts);
}
