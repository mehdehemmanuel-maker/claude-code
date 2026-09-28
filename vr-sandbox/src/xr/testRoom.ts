// A synthetic room for the IWER headset emulator (?iwer): what Space Setup would report for a 4 x 4.5 m room
// with a table and a couch. Lets walk and mixed reality run, and be tested, without a headset. Dev only.

import { NativeMesh, NativePlane, XRRigidTransform, type XRDevice } from 'iwer';

type SEM = NonNullable<XRDevice['sem']>;
type Label = NativePlane['semanticLabel'];

const s = Math.SQRT1_2;

/** Room layout, in the emulator's floor space (y up, floor at 0). */
export const TEST_ROOM = {
  halfX: 2,
  halfZ: 2.25,
  height: 2.6,
  table: { x: 0.9, z: -1.2, halfX: 0.6, halfZ: 0.35, top: 0.74 },
  couch: { x: -1.3, z: 1.2, halfX: 0.45, halfZ: 0.9, top: 0.45 },
};

function rect(hx: number, hz: number) {
  return [new DOMPointReadOnly(-hx, 0, -hz), new DOMPointReadOnly(hx, 0, -hz), new DOMPointReadOnly(hx, 0, hz), new DOMPointReadOnly(-hx, 0, hz)];
}

function plane(p: [number, number, number], q: [number, number, number, number], hx: number, hz: number, label: string) {
  return new NativePlane(new XRRigidTransform({ x: p[0], y: p[1], z: p[2] }, { x: q[0], y: q[1], z: q[2], w: q[3] }), rect(hx, hz), label as Label);
}

/** An axis-aligned box mesh, outward-facing triangles, in its own frame (base at y = 0). */
function box(hx: number, h: number, hz: number) {
  const v = new Float32Array([
    -hx, 0, -hz, hx, 0, -hz, hx, 0, hz, -hx, 0, hz,
    -hx, h, -hz, hx, h, -hz, hx, h, hz, -hx, h, hz,
  ]);
  const i = new Uint32Array([
    0, 1, 2, 0, 2, 3, // bottom
    4, 6, 5, 4, 7, 6, // top
    0, 4, 5, 0, 5, 1, // -z
    3, 2, 6, 3, 6, 7, // +z
    0, 3, 7, 0, 7, 4, // -x
    1, 5, 6, 1, 6, 2, // +x
  ]);
  return { v, i };
}

class TestRoomSEM implements SEM {
  version = 'test-room';
  planesVisible = false;
  boundingBoxesVisible = false;
  meshesVisible = false;
  private canvas = document.createElement('canvas');
  private planes = new Set<NativePlane>();
  private meshes = new Set<NativeMesh>();

  constructor() {
    this.canvas.width = 2;
    this.canvas.height = 2;
    Object.assign(this.canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%' });
    const g = this.canvas.getContext('2d');
    // the "camera feed": a flat warm grey, so passthrough is distinguishable from the workshop
    if (g) {
      g.fillStyle = '#6d6259';
      g.fillRect(0, 0, 2, 2);
    }
    this.loadDefaultEnvironment();
  }

  render() {
    /* static room */
  }

  loadEnvironment() {
    this.loadDefaultEnvironment();
  }

  loadDefaultEnvironment() {
    const { halfX, halfZ, height, table, couch } = TEST_ROOM;
    this.deleteAll();
    const I: [number, number, number, number] = [0, 0, 0, 1];
    this.planes.add(plane([0, 0, 0], I, halfX, halfZ, 'floor'));
    this.planes.add(plane([0, height, 0], [1, 0, 0, 0], halfX, halfZ, 'ceiling'));
    // walls face into the room (+Y of the plane toward the centre)
    this.planes.add(plane([0, height / 2, -halfZ], [s, 0, 0, s], halfX, height / 2, 'wall'));
    this.planes.add(plane([0, height / 2, halfZ], [-s, 0, 0, s], halfX, height / 2, 'wall'));
    this.planes.add(plane([-halfX, height / 2, 0], [0, 0, -s, s], height / 2, halfZ, 'wall'));
    this.planes.add(plane([halfX, height / 2, 0], [0, 0, s, s], height / 2, halfZ, 'wall'));
    this.planes.add(plane([table.x, table.top, table.z], I, table.halfX, table.halfZ, 'table'));
    const c = box(couch.halfX, couch.top, couch.halfZ);
    this.meshes.add(new NativeMesh(new XRRigidTransform({ x: couch.x, y: 0, z: couch.z }), c.v, c.i, 'couch' as Label));
  }

  get environmentCanvas() {
    return this.canvas;
  }

  get trackedPlanes() {
    return this.planes;
  }

  get trackedMeshes() {
    return this.meshes;
  }

  deleteAll() {
    this.planes.clear();
    this.meshes.clear();
  }

  computeHitTestResults() {
    return [];
  }

  computeDepthBuffer() {
    return null;
  }
}

export function installTestRoom(device: XRDevice) {
  device.installSEM(TestRoomSEM as unknown as new (d: XRDevice) => SEM);
}
