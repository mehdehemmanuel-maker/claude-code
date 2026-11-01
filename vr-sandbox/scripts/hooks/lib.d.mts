// Types for lib.mjs, so the one test can import it.
export type Check = { ok: true; why?: string; reset?: boolean } | { ok: false; why: string };
export function checkPush(stamp: { tree: string } | null, commitTree: string): Check;
export function workingTree(repoRoot: string, prefix: string): string;
export function commitTree(repoRoot: string, prefix: string, sha: string): string;
export function taskIdsOf(msg: string): string[];
export function checkBudget(msg: string, files: string[], owners: (task: string) => string[] | undefined, decisions: string[]): Check;
export function ownersFromPlan(planDir: string): (task: string) => string[] | undefined;
export function measuredNumbers(text: string): string[];
export const COMMAND: RegExp;
export function checkHonesty(blocks: string[]): Check;
export function progressOf(text: string): { task: string; note: string };
export function checkLoop(state: Record<string, { fails: number; note: string }>, task: string, note: string): Check;
export function pushes(cmd: string): boolean;
export function entriesOf(text: string): string[];
