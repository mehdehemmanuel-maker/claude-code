// Mixes given as what goes into one cubic metre: so their density is the sum of their parts' masses (worked out, not
// typed), and what they are made of follows from their parts. A mix here is a typical proportioning, not a supplier's
// mix design: it says so.

export interface Mix { name: string; per: 'm^3'; parts: [id: string, kg: number][]; source: string }

export const MIXES: Record<string, Mix> = {
  // water to cement 0.50; about 25 to 30 MPa at 28 days, normal-weight aggregate
  'concrete-c25': { name: 'normal-weight concrete, about 25 MPa, plain (no reinforcing)', per: 'm^3', parts: [['portland-cement', 330], ['water', 165], ['sand-quartz', 750], ['granite', 1090]], source: 'a typical mix of the kind ACI 211.1 proportions (w/c 0.50); not a supplier\'s mix design' },
};
/** A mix's density, kg/m³: its parts' masses in its cubic metre, summed. */
export const mixDensity = (m: Mix): number => m.parts.reduce((a, [, kg]) => a + kg, 0);
