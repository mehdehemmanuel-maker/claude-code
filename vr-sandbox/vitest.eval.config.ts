import { defineConfig } from 'vitest/config';

// The evaluation sets (spec 00, task S5): run apart from the gate, on purpose (they call real models and cost tokens).
export default defineConfig({ test: { include: ['tests/evals/**/*.eval.ts'], testTimeout: 1_800_000 } });
