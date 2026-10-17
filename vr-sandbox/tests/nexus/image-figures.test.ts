// One source of vehicle figures: the image tool's VEHICLES table (tools/image/things/vehicles.mjs, plain JS so it
// paints in a browser) must agree with src/nexus/machines.ts wherever both hold the same machine: lengths, widths,
// heights, axle positions (wheelbases) and tyre diameters within 1 %. Rows machines.ts holds nothing for (the box
// truck, the bus, the road motorcycle, the bicycle, the trailer) must say so in their source.
import { describe, expect, it } from 'vitest';
import { MACHINES, styledCar, tyreOf, type Machine } from '../../src/nexus/machines';
import { VEHICLES, type VehicleRow } from '../../tools/image.mjs';

const machine = (id: string): Machine => MACHINES.find((m) => m.id === id)!;
const styled = (style: string) => styledCar(style, { color: 0, rim: 15, rims: 'steel', power: 'petrol', tint: 'none' });
/** An axle's distance behind the nose: machines.ts measures x from the middle, + forward. */
const fromNose = (m: Machine, i: number) => m.L / 2 - m.axles[i]!.x;
const close = (a: number, b: number, tol = 0.01) => Math.abs(a / b - 1) <= tol;

/** The row's figures against the machine's: L, W, H, each axle's place and its tyre's diameter, within 1 %. */
function agrees(row: VehicleRow, m: Machine, { length = row.length, height = row.height } = {}) {
  expect(close(length, m.L), `${row.name}: length ${length} vs ${m.L}`).toBe(true);
  expect(close(row.width, m.W), `${row.name}: width ${row.width} vs ${m.W}`).toBe(true);
  expect(close(height, m.H), `${row.name}: height ${height} vs ${m.H}`).toBe(true);
  for (const [i, axle] of m.axles.entries()) {
    const u = fromNose(m, i), ours = row.axles[i]!;
    const where = `${row.name}: axle ${i} at ${ours.u} vs ${u.toFixed(3)}`;
    expect(Math.abs(ours.u - u), where).toBeLessThanOrEqual(0.01 * m.L);
    const D = tyreOf(axle.tyre)!.D;
    const tyre = `${row.name}: axle ${i} tyre ${ours.r * 2} vs ${D.toFixed(3)} (${axle.tyre})`;
    expect(close(ours.r * 2, D), tyre).toBe(true);
    expect(Math.abs(ours.track - axle.track), `${row.name}: axle ${i} track`).toBeLessThanOrEqual(0.02 * axle.track);
  }
  const wheelbase = fromNose(m, m.axles.length - 1) - fromNose(m, 0);
  if (m.axles.length === 2) expect(close(row.wheelbase, wheelbase), `${row.name}: wheelbase`).toBe(true);
  expect(close(row.wheelDiameter.front, tyreOf(m.axles[0]!.tyre)!.D), `${row.name}: front tyre`).toBe(true);
}

describe('the image tool\'s vehicle figures against machines.ts', () => {
  it('the car is the Corolla: 4.63 x 1.781 x 1.435, wheelbase 2.7, 205/55R16 on both axles', () => {
    agrees(VEHICLES.car, machine('corolla'));
    agrees(VEHICLES.taxi, machine('corolla')); // the taxi is the same car with a roof sign
    expect(VEHICLES.car.wheelbase).toBeCloseTo(106.3 * 0.0254, 3);
  });

  it('the kart, forklift, ATV, motocrosser and lawn tractor are the machines the project holds', () => {
    agrees(VEHICLES.kart, machine('rental kart'));
    agrees(VEHICLES.forklift, machine('8fgcu25'));
    agrees(VEHICLES.atv, machine('rancher'));
    agrees(VEHICLES.dirtbike, machine('crf450r'));
    agrees(VEHICLES.tractor, machine('x350'));
    expect(VEHICLES.forklift.mast!.height).toBeCloseTo(machine('8fgcu25').H, 6); // the mast lowered is its height
    expect(VEHICLES.forklift.guard!.top).toBeCloseTo(machine('8fgcu25').guardH!, 6);
    expect(VEHICLES.dirtbike.rake).toBeCloseTo(machine('crf450r').rake! * 180 / Math.PI, 2);
    expect(VEHICLES.dirtbike.seat).toBeCloseTo(machine('crf450r').seatH!, 3);
    expect(VEHICLES.atv.seat).toBeCloseTo(machine('rancher').seatH!, 3);
  });

  it('the semi\'s tractor is the Cascadia: 7.166 long, cab 3.03 high, three axles, 315/80R22.5 and 11R22.5', () => {
    const m = machine('cascadia'), row = VEHICLES.semi;
    const tractor = { ...row, width: 2.5, axles: row.axles.slice(0, 3) };
    agrees(tractor, m, { length: row.tractorLength!, height: row.cabHeight! });
    const tandem = (fromNose(m, 1) + fromNose(m, 2)) / 2 - fromNose(m, 0); // published to the tandem's centre
    expect(row.wheelbase).toBeCloseTo(tandem, 3);
    expect(row.axles.length).toBe(5); // plus the trailer's tandem: an 18-wheeler
    expect(row.axles.filter((a) => a.dual).length).toBe(4);
    expect(row.trailer!.startsAt + row.trailer!.length).toBeCloseTo(row.length, 6);
  });

  it('the hatchback, SUV, pickup and van are STYLE\'s body styles through styledCar', () => {
    const styles = [['hatchback', 'hatchback'], ['suv', 'SUV'], ['pickup', 'pickup'], ['van', 'van']] as const;
    for (const [key, style] of styles) {
      agrees(VEHICLES[key], styled(style));
    }
    expect(VEHICLES.pickup.bed!.startsAt).toBeCloseTo(styled('pickup').lines!.deck * VEHICLES.pickup.length, 3);
  });

  it('says which rows machines.ts holds nothing for, and keeps every row\'s overhangs with its axles', () => {
    for (const key of ['truck', 'bus', 'motorcycle', 'bicycle'] as const) {
      expect(VEHICLES[key].source).toMatch(/typical/);
    }
    expect(VEHICLES.semi.source).toMatch(/trailer typical/);
    for (const [key, row] of Object.entries(VEHICLES)) {
      expect(row.source.length, key).toBeGreaterThan(10);
      expect(row.axles[0]!.u, `${key} front overhang`).toBeCloseTo(row.overhangs.front, 3);
      const rear = row.length - row.axles[row.axles.length - 1]!.u;
      expect(rear, `${key} rear overhang`).toBeCloseTo(row.overhangs.rear, 2);
      expect(row.wheelDiameter.front, `${key} front wheel`).toBeCloseTo(row.axles[0]!.r * 2, 6);
      if (row.axles.length === 2) {
        expect(row.axles[1]!.u - row.axles[0]!.u, `${key} wheelbase`).toBeCloseTo(row.wheelbase, 3);
        expect(row.wheelDiameter.rear, `${key} rear wheel`).toBeCloseTo(row.axles[1]!.r * 2, 6);
      }
      for (const a of row.axles) expect(a.u >= 0 && a.u <= row.length && a.r > 0 && a.w > 0, `${key} axle`).toBe(true);
      expect(['none', 'forward', 'mid', 'rear']).toContain(row.cab);
      expect(row.rollHoop).toBe(false); // none in machines.ts: a rental kart's seat shell to 0.5 m stands in
    }
  });
});
