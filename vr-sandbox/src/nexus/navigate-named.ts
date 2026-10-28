// Written by tests/nexus/navigate.test.ts (UPDATE_ATLAS=1): for each library, the nodes whose code in blocks.ts names it
// (NAMED_BY in navigate.ts). Do not edit by hand; the test fails when it is out of date.
export const NAMED: Record<string, string[]> = {
  machines: ['drive', 'engine.run', 'vehicle', 'vehicle.model'],
  powertrains: ['drive', 'engine.run'],
  inventory: ['group.out', 'read', 'research.parts', 'research.toInventory'],
  components: ['card.part', 'part.family'],
  families: ['part.family'],
  sections: ['line', 'route', 'tether'],
  bci: ['battery.starter'],
  motors: ['hinge'],
  gearheads: ['hinge'],
  materials: ['card.material'],
  gases: ['gas'],
  actors: ['afford', 'agent'],
  references: ['research.notes'],
  programs: ['logic.run'],
};
