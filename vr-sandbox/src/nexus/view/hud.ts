// What hangs at the edge of your view in the forge, the way a suit's display does: the time, the day, the weather
// where you are, and what Claude is doing (listening, thinking, working, building). In a headset it follows your head
// lazily, up and to the left, never in the middle of what you look at; on a screen it is a strip in the corner. The
// weather is fetched from Open-Meteo (keyless, open data) for where your device says you are, once you allow it; a page
// that may not reach it (a claude.ai artifact) says so and shows the rest.

import * as THREE from 'three';

export type Status = 'idle' | 'listening' | 'thinking' | 'working' | 'building';
const STATUS: Record<Status, { text: string; color: string }> = {
  idle: { text: 'standing by', color: '#4dd0e1' }, listening: { text: 'listening', color: '#69f0ae' }, thinking: { text: 'thinking', color: '#b388ff' },
  working: { text: 'working', color: '#ffd740' }, building: { text: 'building', color: '#ffb74d' },
};
/** WMO weather interpretation codes, as Open-Meteo gives them. */
const WMO: [number[], string][] = [
  [[0], 'clear'], [[1], 'mostly clear'], [[2], 'partly cloudy'], [[3], 'overcast'], [[45, 48], 'fog'], [[51, 53, 55, 56, 57], 'drizzle'],
  [[61, 63, 65, 66, 67], 'rain'], [[71, 73, 75, 77], 'snow'], [[80, 81, 82], 'showers'], [[85, 86], 'snow showers'], [[95, 96, 99], 'thunderstorm'],
];
const sky = (code: number) => WMO.find(([cs]) => cs.includes(code))?.[1] ?? `code ${code}`;

export interface Weather { temperature: number; code: number; wind: number; lat: number; lon: number; at: number }

export class Hud {
  readonly group = new THREE.Group();
  readonly dom = document.createElement('div');
  status: Status = 'idle';
  detail = '';
  weather: Weather | null = null;
  weatherNote = 'weather: tap Weather to allow your location';
  /** A line of what stands here: parts, mass, flaws; and of the room: frames a second, the headset's battery, time in. */
  info = '';
  battery: number | null = null;
  private readonly since = Date.now();
  private readonly canvas = document.createElement('canvas');
  private readonly tex: THREE.CanvasTexture;
  private readonly ring: THREE.Mesh;
  private readonly sweep: THREE.Mesh;
  private drawnAt = '';
  private placed = false;

  constructor() {
    this.canvas.width = 1024; this.canvas.height = 392;
    this.tex = new THREE.CanvasTexture(this.canvas); this.tex.colorSpace = THREE.SRGBColorSpace;
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.15), new THREE.MeshBasicMaterial({ map: this.tex, transparent: true, depthWrite: false, depthTest: false }));
    plate.renderOrder = 30; this.group.add(plate);
    // the ring of the seconds, and its sweep, a little in front of the plate's left end
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.046, 0.05, 64), new THREE.MeshBasicMaterial({ color: 0x4dd0e1, transparent: true, opacity: 0.5, depthTest: false, side: THREE.DoubleSide }));
    this.sweep = new THREE.Mesh(new THREE.RingGeometry(0.052, 0.058, 64, 1, 0, Math.PI / 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthTest: false, side: THREE.DoubleSide }));
    for (const m of [this.ring, this.sweep]) { m.position.set(-0.14, 0, 0.002); m.renderOrder = 31; this.group.add(m); }
    this.dom.style.cssText = 'position:fixed;left:16px;top:calc(12px + env(safe-area-inset-top,0px));z-index:6;display:flex;gap:12px;align-items:center;font:600 13px system-ui;color:#bdefff;padding:6px 12px;border-radius:999px;background:rgba(3,14,22,0.72);border:1px solid #1f5866;font-variant-numeric:tabular-nums;max-width:calc(100vw - 32px);flex-wrap:wrap';
    document.body.appendChild(this.dom);
  }

  /** Where you are, if you allow it, and the weather there now. */
  async locate(): Promise<string> {
    if (!('geolocation' in navigator)) { this.weatherNote = 'weather: this device gives no location'; return this.weatherNote; }
    const pos = await new Promise<GeolocationPosition | null>((ok) => navigator.geolocation.getCurrentPosition(ok, () => ok(null), { timeout: 8000, maximumAge: 6e5 }));
    if (!pos) { this.weatherNote = 'weather: location not allowed here'; return this.weatherNote; }
    return this.fetchWeather(pos.coords.latitude, pos.coords.longitude);
  }
  async fetchWeather(lat: number, lon: number): Promise<string> {
    try {
      const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(3)}&longitude=${lon.toFixed(3)}&current=temperature_2m,weather_code,wind_speed_10m&wind_speed_unit=ms`);
      if (!r.ok) throw new Error(String(r.status));
      const j = (await r.json()) as { current?: { temperature_2m: number; weather_code: number; wind_speed_10m: number } };
      if (!j.current) throw new Error('no current weather');
      this.weather = { temperature: j.current.temperature_2m, code: j.current.weather_code, wind: j.current.wind_speed_10m, lat, lon, at: Date.now() };
      this.weatherNote = '';
      this.drawnAt = '';
      return `${this.weather.temperature.toFixed(0)} °C, ${sky(this.weather.code)}, wind ${this.weather.wind.toFixed(0)} m/s`;
    } catch {
      this.weatherNote = 'weather: the forecast is not reachable from this page';
      this.drawnAt = '';
      return this.weatherNote;
    }
  }
  /** The headset's or the device's charge, where the browser tells it. */
  async watchBattery(): Promise<void> {
    const nav = navigator as Navigator & { getBattery?: () => Promise<{ level: number; addEventListener(t: string, f: () => void): void }> };
    if (!nav.getBattery) return;
    try { const b = await nav.getBattery(); const up = () => { this.battery = b.level; this.drawnAt = ''; }; up(); b.addEventListener('levelchange', up); } catch { /* not told */ }
  }
  set(status: Status, detail = ''): void { if (status !== this.status || detail !== this.detail) { this.status = status; this.detail = detail; this.drawnAt = ''; } }

  private draw(now: Date): void {
    const g = this.canvas.getContext('2d')!, W = this.canvas.width, H = this.canvas.height, st = STATUS[this.status];
    g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(2,12,20,0.55)'; g.beginPath(); g.roundRect(4, 4, W - 8, H - 8, 40); g.fill();
    g.strokeStyle = 'rgba(77,208,225,0.55)'; g.lineWidth = 3; g.stroke();
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), date = now.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' });
    g.textBaseline = 'top'; g.fillStyle = '#ffffff'; g.font = '300 128px system-ui'; g.fillText(time, 300, 36);
    g.fillStyle = '#9fdfee'; g.font = '500 40px system-ui'; g.fillText(date, 300, 182);
    const w = this.weather;
    g.fillStyle = w ? '#ffe082' : '#7fb3c8'; g.font = '500 38px system-ui';
    g.fillText(w ? `${w.temperature.toFixed(0)} °C · ${sky(w.code)} · wind ${w.wind.toFixed(0)} m/s` : this.weatherNote.replace(/^weather: /, ''), 300, 238);
    const mins = Math.floor((Date.now() - this.since) / 60000), extra = `${this.battery !== null ? `battery ${Math.round(this.battery * 100)} % · ` : ''}in the forge ${mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)} h ${mins % 60} min`}`;
    g.fillStyle = '#7fb3c8'; g.font = '400 30px system-ui'; g.fillText(`${this.info ? `${this.info} · ` : ''}${extra}`.slice(0, 64), 300, 350);
    g.fillStyle = st.color; g.beginPath(); g.arc(320, 316, 14, 0, Math.PI * 2); g.fill();
    g.font = '600 38px system-ui'; g.fillText(`CLAUDE · ${st.text}${this.detail ? ` · ${this.detail}` : ''}`.slice(0, 48), 346, 296);
    // the dial's numerals: the hour, large, in the ring
    g.fillStyle = '#4dd0e1'; g.font = '200 96px system-ui'; g.textAlign = 'center'; g.fillText(String(now.getSeconds()).padStart(2, '0'), 150, 136); g.textAlign = 'left';
    this.tex.needsUpdate = true;
    this.dom.replaceChildren(
      Object.assign(document.createElement('span'), { textContent: `${time} · ${date}` }),
      Object.assign(document.createElement('span'), { textContent: w ? `${w.temperature.toFixed(0)} °C ${sky(w.code)}` : this.weatherNote, style: `color:${w ? '#ffe082' : '#7fb3c8'};font-weight:500` }),
      Object.assign(document.createElement('span'), { textContent: `● Claude · ${st.text}${this.detail ? ` · ${this.detail}` : ''}`, style: `color:${st.color}` }),
      Object.assign(document.createElement('span'), { textContent: `${this.info ? `${this.info} · ` : ''}${extra}`, style: 'color:#7fb3c8;font-weight:500' }),
    );
  }

  /** Each frame: the seconds sweep turns; once a second the face is drawn; in a headset it follows your head. */
  update(head: THREE.Camera, eye: THREE.Vector3, xr: boolean, dt: number): void {
    const now = new Date(), key = `${now.getSeconds()}|${this.status}|${this.detail}|${this.weather?.at ?? this.weatherNote}|${this.info}|${this.battery}`;
    if (key !== this.drawnAt) { this.drawnAt = key; this.draw(now); }
    this.sweep.rotation.z = -((now.getSeconds() + now.getMilliseconds() / 1000) / 60) * Math.PI * 2 + Math.PI / 2;
    (this.ring.material as THREE.MeshBasicMaterial).color.set(STATUS[this.status].color);
    this.dom.style.display = xr ? 'none' : 'flex';
    this.group.visible = xr;
    if (!xr) return;
    const fwd = new THREE.Vector3(); head.getWorldDirection(fwd); fwd.y = 0; if (fwd.lengthSq() < 1e-6) fwd.set(0, 0, -1); fwd.normalize();
    const left = new THREE.Vector3(fwd.z, 0, -fwd.x);
    const want = eye.clone().addScaledVector(fwd, 0.95).addScaledVector(left, 0.42).add(new THREE.Vector3(0, 0.3, 0));
    if (!this.placed) { this.group.position.copy(want); this.placed = true; } else this.group.position.lerp(want, Math.min(1, dt * 1.6));
    this.group.lookAt(eye);
  }
}
