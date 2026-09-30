import { defineConfig } from 'vitest/config';

// The stress-test web: long and report-producing, so kept out of the normal suite (npm run stress).
export default defineConfig({ worker: { format: 'es' }, test: { include: ['tests/stress/**/*.test.ts'], testTimeout: 4 * 3_600_000 } });
