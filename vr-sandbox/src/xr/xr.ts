// WebXR mode for Meta Quest (3S target). Controllers drive the same tools as the mouse; the wrist tablet
// replaces the HTML panels. Standard xr-standard gamepad layout: 0 trigger, 1 squeeze, 3 stick press,
// 4 A/X, 5 B/Y; axes 2/3 thumbstick.
//
// Three ways to be there:
//  relax  - the virtual workshop, flying with the sticks, any size.
//  walk   - the workshop at 1:1, calibrated so your real room sits in it: you walk to move, and your real walls
//           and furniture (from the headset's room scan) appear and are solid to the parts.
//  mixed  - passthrough: the build is in your real room, which is the physics (parts land on your real table).

import * as THREE from 'three';
import type { App } from '../app/app';
import { Hud } from './hud';
import type { PointerEvt, ToolManager } from '../tools/tools';
import { RoomScanner } from './room';
import { Tablet } from './tablet';

export type XRStyle = 'relax' | 'walk' | 'mixed';
/** Where walk mode puts the spot you calibrate from: open floor, facing the workbench 2 m ahead. */
const HOME = { x: -3, z: -1.6, yaw: 0 };
const STYLE_KEY = 'vrsb.xrStyle';
const WALK_KEY = 'vrsb.walk';

function stored<T>(key: string): T | null {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : null;
  } catch {
    return null;
  }
}

function store(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* storage unavailable */
  }
}

type Handedness = 'left' | 'right';

interface Hand {
  side: Handedness;
  ray: THREE.Group;
  grip: THREE.Group;
  gamepad: Gamepad | null;
  pressed: boolean[];
  pointer: THREE.Mesh;
  turnArmed: boolean;
  onTablet: boolean;
}

const BTN = { trigger: 0, squeeze: 1, stick: 3, a: 4, b: 5 };

export class XRMode {
  readonly hands: Partial<Record<Handedness, Hand>> = {};
  readonly tablet: Tablet;
  private raycaster = new THREE.Raycaster();
  private session: XRSession | null = null;
  private savedShadows = true;
  private lastScale = 1;
  /** The mode picked for the next session, and the one running now. */
  style: XRStyle = stored<XRStyle>(STYLE_KEY) ?? 'relax';
  active: XRStyle = 'relax';
  /** Whether the running session can show passthrough (so every mode is available in it). */
  passthrough = false;
  private refType: XRReferenceSpaceType = 'local-floor';
  private scanner = new RoomScanner();
  private needCalibration = false;
  private scanWarned = false;
  private sessionStart = 0;
  private bounds: THREE.LineLoop | null = null;
  private lastHead = new THREE.Vector3();
  /** Relax mode: the left stick drives the build's motors and steering instead of flying you. */
  drive = false;

  /** Where the player stands (and faces) on entering VR: the workshop's doorway at first, then where they left. */
  private resume = { x: 0, z: 3.4, yaw: 0 };
  readonly hud: Hud;

  constructor(private app: App, private tools: ToolManager) {
    this.tablet = new Tablet(app, tools);
    this.hud = new Hud(app, app.view.camera);
    this.tablet.room = this;
    const renderer = app.renderer;
    for (const i of [0, 1]) {
      const ray = renderer.xr.getController(i);
      const grip = renderer.xr.getControllerGrip(i);
      app.view.rig.add(ray, grip);
      ray.addEventListener('connected', (e) => this.connect(ray, grip, (e as unknown as { data: XRInputSource }).data));
      ray.addEventListener('disconnected', () => {
        for (const side of ['left', 'right'] as const) if (this.hands[side]?.ray === ray) {
          this.tools.grab.release(side);
          delete this.hands[side];
        }
      });
    }
    app.haptic = (intensity, ms, hand) => {
      for (const side of hand && hand !== 'mouse' ? [hand as Handedness] : (['left', 'right'] as const)) {
        const gp = this.hands[side]?.gamepad as (Gamepad & { hapticActuators?: { pulse(v: number, d: number): void }[] }) | null | undefined;
        try {
          if (gp?.hapticActuators?.[0]) gp.hapticActuators[0].pulse(intensity, ms);
          else (gp?.vibrationActuator as unknown as { playEffect?: (t: string, o: object) => void })?.playEffect?.('dual-rumble', { duration: ms, strongMagnitude: intensity, weakMagnitude: intensity });
        } catch {
          /* haptics unsupported */
        }
      }
    };
    // a build with motors on the stick channels is for driving; anything else, the stick flies you
    app.onLoad.push(() => {
      this.drive = app.hasStickControls();
      if (this.app.renderer.xr.isPresenting && this.drive) this.app.toast('This build has motors: the left stick drives it. Menu → World → "Left stick" switches to flying.', 'info');
    });
    this.drive = app.hasStickControls();
    renderer.xr.addEventListener('sessionstart', () => this.onStart());
    renderer.xr.addEventListener('sessionend', () => this.onEnd());
    app.onFrame.push((dt, time) => this.frame(dt, time));
  }

  static async passthroughSupported() {
    try {
      return !!navigator.xr && (await navigator.xr.isSessionSupported('immersive-ar'));
    } catch {
      return false;
    }
  }

  /**
   * Start a session in the given mode. Walk and mixed ask for an AR-capable session where the headset has one:
   * that is what grants the room scan (and lets the session switch among all three modes); walk keeps the
   * workshop opaque over the passthrough.
   */
  async enter(style: XRStyle = this.style) {
    if (this.session) return;
    this.style = style;
    store(STYLE_KEY, style);
    void this.app.audio.start();
    const xr = navigator.xr!;
    const ar = style !== 'relax' && (await XRMode.passthroughSupported());
    if (style === 'mixed' && !ar) {
      this.app.toast('This headset has no passthrough, so mixed reality is not available: starting walk mode', 'warn');
      style = 'walk';
    }
    const features = ['local-floor', 'bounded-floor', 'hand-tracking'];
    if (style !== 'relax') features.push('plane-detection', 'mesh-detection');
    if (ar) features.push('anchors');
    const session = await xr.requestSession(ar ? 'immersive-ar' : 'immersive-vr', { optionalFeatures: features });
    this.passthrough = ar;
    this.active = style;
    // walk: the bounded (guardian) space is fixed to the real room across sessions, so a calibration keeps
    this.refType = 'local-floor';
    if (style === 'walk') {
      try {
        await session.requestReferenceSpace('bounded-floor');
        this.refType = 'bounded-floor';
      } catch {
        /* no bounded space: calibrate every session */
      }
    }
    this.app.renderer.xr.setReferenceSpaceType(this.refType);
    this.app.renderer.xr.setFoveation(1);
    await this.app.renderer.xr.setSession(session);
    this.session = session;
  }

  /** Switch mode inside a running session (mixed needs a passthrough session). */
  setDrive(drive: boolean) {
    this.drive = drive;
    this.app.channels['throttle'] = 0;
    this.app.channels['steer'] = 0;
    this.app.notify();
  }

  setStyle(style: XRStyle) {
    if (style === 'mixed' && !this.passthrough) {
      this.app.toast('Mixed reality needs a passthrough session: exit VR and enter with Mixed reality', 'warn');
      return;
    }
    this.style = style;
    store(STYLE_KEY, style);
    if (!this.app.renderer.xr.isPresenting) {
      this.app.notify();
      return;
    }
    this.active = style;
    this.applyStyle();
  }

  private applyStyle() {
    const app = this.app;
    const rig = app.view.rig;
    const style = this.active;
    this.scanner.reset();
    app.setWorld(style === 'mixed' ? 'mixed' : 'workshop');
    app.setRoom(this.scanner.surfaces, style === 'relax' ? 'none' : style);
    if (style === 'mixed') {
      // the reference space is the real room: identity rig, real scale
      rig.position.set(0, 0, 0);
      rig.rotation.set(0, 0, 0);
      this.needCalibration = false;
      // shadows on the real table are most of what makes a part look present
      app.view.sun.castShadow = true;
    } else {
      app.view.sun.castShadow = app.settings.shadows;
    }
    if (style === 'walk') {
      const saved = this.refType === 'bounded-floor' ? stored<{ x: number; z: number; yaw: number }>(WALK_KEY) : null;
      if (saved) {
        rig.position.set(saved.x, 0, saved.z);
        rig.rotation.set(0, saved.yaw, 0);
        this.needCalibration = false;
      } else this.needCalibration = true;
    }
    if (style === 'relax') {
      rig.position.y = Math.max(0, rig.position.y);
    }
    this.updateBounds();
    app.notify();
  }

  /** Walk mode: map where you stand and face now onto the workshop's home spot. */
  recalibrate() {
    if (this.active === 'walk') this.needCalibration = true;
  }

  get calibrated() {
    return this.active === 'walk' && !this.needCalibration;
  }

  /** Quest: open Space Setup to scan (or rescan) the room. */
  get canScan() {
    return typeof (this.session as unknown as { initiateRoomCapture?: unknown } | null)?.initiateRoomCapture === 'function';
  }

  scan() {
    const s = this.session as unknown as { initiateRoomCapture?: () => Promise<void> } | null;
    void s?.initiateRoomCapture?.().catch(() => this.app.toast('The headset declined to start a room scan', 'warn'));
  }

  private calibrate(view: XRRigidTransform) {
    const rig = this.app.view.rig;
    const q = new THREE.Quaternion(view.orientation.x, view.orientation.y, view.orientation.z, view.orientation.w);
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(q);
    const viewYaw = Math.atan2(-fwd.x, -fwd.z);
    const yaw = HOME.yaw - viewYaw;
    const local = new THREE.Vector3(view.position.x, 0, view.position.z).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    rig.position.set(HOME.x - local.x, 0, HOME.z - local.z);
    rig.rotation.set(0, yaw, 0);
    this.needCalibration = false;
    if (this.refType === 'bounded-floor') store(WALK_KEY, { x: rig.position.x, z: rig.position.z, yaw });
    this.app.haptic?.(0.3, 40);
    this.app.toast('Calibrated: walk to move. Your walls and furniture are outlined and solid.', 'ok');
    this.app.notify();
  }

  /** Walk mode: the headset's play-area boundary drawn on the workshop floor. */
  private updateBounds() {
    const rig = this.app.view.rig;
    if (this.bounds) {
      rig.remove(this.bounds);
      this.bounds.geometry.dispose();
      this.bounds = null;
    }
    if (this.active !== 'walk') return;
    const ref = this.app.renderer.xr.getReferenceSpace() as (XRReferenceSpace & { boundsGeometry?: DOMPointReadOnly[] }) | null;
    const pts = ref?.boundsGeometry;
    if (!pts || pts.length < 3) return;
    const geo = new THREE.BufferGeometry().setFromPoints(pts.map((p) => new THREE.Vector3(p.x, 0.004, p.z)));
    this.bounds = new THREE.LineLoop(geo, new THREE.LineBasicMaterial({ color: 0x7fe0ff, transparent: true, opacity: 0.8 }));
    rig.add(this.bounds);
  }

  private connect(ray: THREE.Group, grip: THREE.Group, src: XRInputSource) {
    const side = src.handedness === 'left' ? 'left' : 'right';
    // controller body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.03, 0.1), new THREE.MeshStandardMaterial({ color: 0x2a2f36, roughness: 0.5 }));
    body.position.z = 0.02;
    grip.add(body);
    const pointer = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0012, 0.0012, 1, 6).translate(0, 0.5, 0).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: side === 'right' ? 0x66b3ff : 0xffb347, transparent: true, opacity: 0.7 }),
    );
    pointer.scale.z = 3;
    ray.add(pointer);
    if (side === 'left') {
      // tablet floats above the left controller, tilted toward the face
      this.tablet.mesh.position.set(0, 0.07, -0.08);
      this.tablet.mesh.rotation.set(-0.75, 0, 0);
      grip.add(this.tablet.mesh);
    }
    this.hands[side] = { side, ray, grip, gamepad: src.gamepad ?? null, pressed: [], pointer, turnArmed: true, onTablet: false };
  }

  private onStart() {
    const rig = this.app.view.rig;
    rig.position.set(this.resume.x, 0, this.resume.z);
    rig.rotation.set(0, this.resume.yaw, 0);
    this.app.view.camera.position.set(0, 0, 0);
    this.app.view.camera.rotation.set(0, 0, 0);
    this.savedShadows = this.app.settings.shadows;
    // Quest budget: real-time shadow maps cost a full extra scene pass per frame; start without.
    this.app.settings.shadows = false;
    this.app.view.sun.castShadow = false;
    this.scanWarned = false;
    this.sessionStart = performance.now();
    this.applyStyle();
    const hints: Record<XRStyle, string> = {
      relax: 'VR: trigger = tool · grip = grab · left stick = fly · right stick = turn / rise · B = menu',
      walk: 'Walk mode: stand where you want to start, facing into your room. Walk to move · B = menu',
      mixed: 'Mixed reality: your room is the world. Parts land on your real table and floor · B = menu',
    };
    this.app.toast(hints[this.active], 'info');
  }

  private onEnd() {
    this.session = null;
    const rig = this.app.view.rig;
    // back in the headset later, carry on from where the head was
    this.resume = { x: this.lastHead.x, z: this.lastHead.z, yaw: rig.rotation.y };
    rig.scale.setScalar(1);
    this.lastScale = 1;
    this.app.settings.shadows = this.savedShadows;
    this.app.view.sun.castShadow = this.savedShadows;
    this.tools.grab.release();
    this.active = 'relax';
    this.scanner.reset();
    this.updateBounds();
    this.app.setRoom([], 'none');
    this.app.setWorld('workshop');
  }

  private evt(h: Hand): PointerEvt {
    const origin = new THREE.Vector3();
    const q = new THREE.Quaternion();
    h.ray.getWorldPosition(origin);
    h.ray.getWorldQuaternion(q);
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(q);
    return { ray: { origin, dir }, button: 0, shift: this.tools.whole, ctrl: false, source: h.side, handQuat: [q.x, q.y, q.z, q.w] };
  }

  private frame(dt: number, time: number) {
    if (!this.app.renderer.xr.isPresenting) return;
    const rig = this.app.view.rig;
    // walking and mixed reality are 1:1 with the real room; only relax mode flies and resizes
    const free = this.active === 'relax';
    const scale = free ? this.app.settings.playerScale : 1;
    if (scale !== this.lastScale) {
      rig.scale.setScalar(scale);
      this.lastScale = scale;
    }
    this.sceneFrame(time);
    // Head pose in the world from the scene camera, which three.js keeps inside the rig. (The XR array camera's
    // own getWorldPosition/Direction recompute it without the rig: reference-space values, which point the wrong
    // way as soon as the rig has turned.)
    // The head itself is between the eyes: the combined camera sits a little behind them to cover both views.
    const cam = this.app.view.camera;
    const head = new THREE.Vector3();
    const eyes = this.app.renderer.xr.getCamera().cameras;
    if (eyes.length) {
      const e = new THREE.Vector3();
      for (const c of eyes) head.add(e.setFromMatrixPosition(c.matrixWorld));
      head.multiplyScalar(1 / eyes.length);
    } else cam.getWorldPosition(head);
    this.lastHead.copy(head);
    let tabletUv: THREE.Vector2 | null = null;
    for (const side of ['left', 'right'] as const) {
      const h = this.hands[side];
      if (!h) continue;
      // live gamepad object from the session (three keeps the one from 'connected')
      const src = this.session ? [...this.session.inputSources].find((s) => s.handedness === side) : undefined;
      if (src?.gamepad) h.gamepad = src.gamepad;
      const gp = h.gamepad;
      const e = this.evt(h);
      // tablet hover with the right ray
      h.onTablet = false;
      if (side === 'right' && this.tablet.visible) {
        this.raycaster.set(e.ray.origin, e.ray.dir);
        const hit = this.raycaster.intersectObject(this.tablet.mesh, false)[0];
        if (hit?.uv) {
          tabletUv = hit.uv.clone();
          h.onTablet = true;
          h.pointer.scale.z = hit.distance / scale;
        }
      }
      if (!h.onTablet) {
        const pick = this.app.view.pick(e.ray.origin, e.ray.dir, 40 * scale);
        h.pointer.scale.z = (pick ? pick.distance : 3 * scale) / scale;
        (h.pointer.material as THREE.MeshBasicMaterial).opacity = pick && pick.type !== 'env' ? 0.95 : 0.45;
      }
      if (side === 'right') this.tools.last = e;
      this.tools.grab.updateHand(e);
      if (!gp) continue;
      const down = (i: number) => !!gp.buttons[i]?.pressed;
      const edge = (i: number) => {
        const now = down(i);
        const was = h.pressed[i] ?? false;
        h.pressed[i] = now;
        return now && !was ? 1 : !now && was ? -1 : 0;
      };
      // trigger: tablet first, then the active tool
      const tr = edge(BTN.trigger);
      if (tr === 1) {
        if (h.onTablet && tabletUv) this.tablet.click(tabletUv);
        else this.tools.down(e);
      } else if (tr === -1 && !h.onTablet) this.tools.up(e);
      else if (down(BTN.trigger) && !h.onTablet) this.tools.move(e);
      // grip: grab what the ray points at (up to 4 m), with this hand
      const sq = edge(BTN.squeeze);
      if (sq === 1 && !h.onTablet) {
        const pick = this.app.view.pick(e.ray.origin, e.ray.dir, 4 * scale);
        if (pick?.type === 'part' && pick.id) {
          // joined parts are one piece: grabbing one selects its assembly
          this.app.select([pick.id, ...this.app.component(pick.id).filter((x) => x !== pick.id)]);
          this.tools.grab.begin(pick.id, [pick.point.x, pick.point.y, pick.point.z], pick.distance, e, side, pick.seg);
        }
      } else if (sq === -1) this.tools.grab.release(side);
      // buttons
      if (side === 'right') {
        if (edge(BTN.a) === 1) this.tools.setActive((this.tools.active + 1) % this.tools.tools.length);
        if (edge(BTN.b) === 1) this.tablet.setVisible(!this.tablet.visible);
        if (edge(BTN.stick) === 1) this.app.rewind();
      } else {
        if (edge(BTN.a) === 1) this.app.undo(); // X
        if (edge(BTN.b) === 1) this.app.redo(); // Y
        if (edge(BTN.stick) === 1) this.app.checkpoint();
      }
      const ax = gp.axes[2] ?? 0;
      const ay = gp.axes[3] ?? 0;
      const dead = (v: number) => (Math.abs(v) < 0.15 ? 0 : v);
      if (side === 'left') {
        // In relax mode the stick either flies you or drives the build, never both (you would fly off the kart).
        // Walk and mixed reality don't fly, so there it always drives.
        const driving = this.drive || !free;
        if (free && !driving) {
          // fly the way the head faces (yaw only); looking straight down, the top of the view points forward
          const fwd = new THREE.Vector3();
          cam.getWorldDirection(fwd);
          fwd.y = 0;
          if (fwd.lengthSq() < 0.04) fwd.set(0, 1, 0).applyQuaternion(cam.getWorldQuaternion(new THREE.Quaternion())).setY(0);
          fwd.normalize();
          const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
          const speed = 2.2 * scale;
          rig.position.addScaledVector(fwd, -dead(ay) * speed * dt);
          rig.position.addScaledVector(right, dead(ax) * speed * dt);
        }
        this.app.channels['throttle'] = driving && !this.tablet.visible ? -dead(ay) : 0;
        this.app.channels['steer'] = driving && !this.tablet.visible ? -dead(ax) : 0;
      } else {
        // snap turn about the head (relax only: turning would unhook the real room)
        if (free && Math.abs(ax) > 0.7 && h.turnArmed) {
          h.turnArmed = false;
          const a = (ax > 0 ? -1 : 1) * (Math.PI / 6);
          const offset = rig.position.clone().sub(head);
          offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), a);
          rig.position.copy(head).add(offset);
          rig.rotation.y += a;
          this.app.haptic?.(0.15, 10, 'right');
        } else if (Math.abs(ax) < 0.3) h.turnArmed = true;
        // push/pull a held part, otherwise fly up/down
        if (this.tools.grab.holdingWith('right')) this.tools.grab.adjustDistance('right', Math.exp(-dead(ay) * dt * 2.5));
        else if (this.tools.grab.holdingWith('left')) this.tools.grab.adjustDistance('left', Math.exp(-dead(ay) * dt * 2.5));
        else if (free) rig.position.y = Math.max(0, rig.position.y - dead(ay) * 1.6 * scale * dt);
      }
    }
    this.tablet.update(time, tabletUv);
    this.hud.update(dt);
    this.updateAda(dt, time);
  }

  /**
   * Ada's presence: a small light that keeps at your left shoulder, a little ahead, and glows amber when she has
   * something to tell you (her page on the tablet says what). It is light only, and never touches the build.
   */
  private adaOrb: THREE.Mesh | null = null;
  private updateAda(dt: number, time: number) {
    const ada = this.app.ada;
    if (!ada) return;
    if (!this.adaOrb) {
      this.adaOrb = new THREE.Mesh(new THREE.SphereGeometry(0.035, 24, 16), new THREE.MeshBasicMaterial({ color: 0x8fd3ff, transparent: true, opacity: 0.85 }));
      this.adaOrb.name = 'ada';
      this.adaOrb.renderOrder = 6;
      this.app.view.scene.add(this.adaOrb);
    }
    const cam = this.app.renderer.xr.getCamera();
    const head = cam.getWorldPosition(new THREE.Vector3());
    const yaw = new THREE.Euler().setFromQuaternion(cam.getWorldQuaternion(new THREE.Quaternion()), 'YXZ').y;
    const s = this.app.settings.playerScale;
    const want = new THREE.Vector3(-0.42 * s, -0.12 * s, -0.55 * s).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw).add(head);
    this.adaOrb.position.lerp(want, 1 - Math.exp(-dt * 4));
    const news = ada.advice.length > 0;
    const pulse = 1 + (news ? 0.18 : 0.06) * Math.sin(time / (news ? 180 : 600));
    this.adaOrb.scale.setScalar(s * pulse);
    (this.adaOrb.material as THREE.MeshBasicMaterial).color.setHex(news ? (ada.advice[0]!.kind === 'break' ? 0xff7a5c : 0xffc14d) : 0x8fd3ff);
  }

  /** Calibration and the room scan, from this frame's XR data. */
  private sceneFrame(time: number) {
    if (this.active === 'relax') return;
    const xr = this.app.renderer.xr;
    const frame = xr.getFrame();
    const ref = xr.getReferenceSpace();
    if (!frame || !ref) return;
    if (this.needCalibration) {
      const pose = frame.getViewerPose(ref);
      if (pose) this.calibrate(pose.transform);
    }
    const rig = this.app.view.rig;
    rig.updateMatrixWorld();
    const surfaces = this.scanner.update(frame, ref, rig.matrixWorld, time);
    if (surfaces) this.app.setRoom(surfaces, this.active);
    if (!this.scanner.available && !this.scanWarned && performance.now() - this.sessionStart > 3000) {
      this.scanWarned = true;
      this.app.toast(
        this.active === 'walk'
          ? 'No room scan from this headset: the play-area outline is shown. Run Space Setup to get walls and furniture.'
          : 'No room scan yet: run Space Setup (menu → World → Scan room) so parts can land on your furniture.',
        'warn',
      );
    }
  }
}
