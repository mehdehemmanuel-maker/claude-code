// WebXR mode for Meta Quest (3S target). Controllers drive the same tools as the mouse; the wrist tablet
// replaces the HTML panels. Standard xr-standard gamepad layout: 0 trigger, 1 squeeze, 3 stick press,
// 4 A/X, 5 B/Y; axes 2/3 thumbstick.

import * as THREE from 'three';
import type { App } from '../app/app';
import type { DesktopControls } from '../interaction/desktop';
import type { PointerEvt, ToolManager } from '../tools/tools';
import { Tablet } from './tablet';

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

  constructor(private app: App, private tools: ToolManager, private desktop: DesktopControls) {
    this.tablet = new Tablet(app, tools);
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
    renderer.xr.addEventListener('sessionstart', () => this.onStart());
    renderer.xr.addEventListener('sessionend', () => this.onEnd());
    app.onFrame.push((dt, time) => this.frame(dt, time));
  }

  async enter() {
    if (this.session) return;
    void this.app.audio.start();
    const session = await navigator.xr!.requestSession('immersive-vr', { optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking'] });
    this.app.renderer.xr.setReferenceSpaceType('local-floor');
    this.app.renderer.xr.setFoveation(1);
    await this.app.renderer.xr.setSession(session);
    this.session = session;
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
    this.desktop.enabled = false;
    const rig = this.app.view.rig;
    rig.position.set(this.desktop.pos.x, 0, this.desktop.pos.z);
    rig.rotation.set(0, this.desktop.yaw, 0);
    this.app.view.camera.position.set(0, 0, 0);
    this.app.view.camera.rotation.set(0, 0, 0);
    this.savedShadows = this.app.settings.shadows;
    // Quest budget: real-time shadow maps cost a full extra scene pass per frame; start without.
    this.app.settings.shadows = false;
    this.app.view.sun.castShadow = false;
    document.getElementById('crosshair')?.setAttribute('style', 'display:none');
    this.app.toast('VR: trigger = tool · grip = grab · left stick = fly · right stick = turn / rise · B = menu', 'info');
  }

  private onEnd() {
    this.session = null;
    this.desktop.enabled = true;
    const rig = this.app.view.rig;
    this.desktop.pos.set(rig.position.x, rig.position.y + 1.6, rig.position.z);
    this.desktop.yaw = rig.rotation.y;
    rig.scale.setScalar(1);
    this.app.settings.shadows = this.savedShadows;
    this.app.view.sun.castShadow = this.savedShadows;
    this.tools.grab.release();
  }

  private evt(h: Hand): PointerEvt {
    const origin = new THREE.Vector3();
    const q = new THREE.Quaternion();
    h.ray.getWorldPosition(origin);
    h.ray.getWorldQuaternion(q);
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(q);
    return { ray: { origin, dir }, button: 0, shift: false, ctrl: false, source: h.side, handQuat: [q.x, q.y, q.z, q.w] };
  }

  private frame(dt: number, time: number) {
    if (!this.app.renderer.xr.isPresenting) return;
    const rig = this.app.view.rig;
    const scale = this.app.settings.playerScale;
    if (scale !== this.lastScale) {
      rig.scale.setScalar(scale);
      this.lastScale = scale;
    }
    const cam = this.app.renderer.xr.getCamera();
    const head = new THREE.Vector3();
    cam.getWorldPosition(head);
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
          this.app.select([pick.id]);
          this.tools.grab.begin(pick.id, [pick.point.x, pick.point.y, pick.point.z], pick.distance, e, side);
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
        // fly in the direction the head faces (yaw only), speed scales with player size
        const fwd = new THREE.Vector3();
        cam.getWorldDirection(fwd);
        fwd.y = 0;
        fwd.normalize();
        const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
        const speed = 2.2 * scale;
        rig.position.addScaledVector(fwd, -dead(ay) * speed * dt);
        rig.position.addScaledVector(right, dead(ax) * speed * dt);
        // left stick also steers vehicles while the menu is hidden
        this.app.channels['throttle'] = this.tablet.visible ? 0 : -dead(ay);
        this.app.channels['steer'] = this.tablet.visible ? 0 : -dead(ax);
      } else {
        // snap turn about the head
        if (Math.abs(ax) > 0.7 && h.turnArmed) {
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
        else rig.position.y = Math.max(0, rig.position.y - dead(ay) * 1.6 * scale * dt);
        this.app.channels['aux'] = 0;
      }
    }
    this.tablet.update(time, tabletUv);
  }
}
