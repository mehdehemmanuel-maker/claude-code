// The kernel (spec 10, T23; research 31): it checks, it never searches. It imports nothing outside this folder (the gate
// checks its import list), decides with exact rationals and outward-rounded intervals, and refuses what it cannot
// decide. Its one door is `check`: a certificate in, a verdict out. What is here (0.1.0): the envelope; the kinds dims
// and witness, and judged (never a pass). The other kinds research 31 lists (cover, farkas, lrat, model, gap, sweep,
// rewrite, refines, table, sample) are not built yet; a certificate of one is refused as malformed.
export { check, parseCertificate, KERNEL_VERSION, type Certificate, type Verdict, type Kind } from './cert';
