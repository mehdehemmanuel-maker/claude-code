// The rigid-body realization: the kept kernel wrapped as a morphism with a contract. This is the only module of the
// core that speaks to the engine. A body exists in the kernel if and only if a configuration body binds it; the
// kernel's words for things (its part kinds) live here and nowhere else. What the kernel cannot see, the contract
// says it cannot see: the sag of an elastic beam is unobserved by a realization whose bodies are rigid.

import type initJolt from 'jolt-physics/wasm-compat';

export type Jolt = Awaited<ReturnType<typeof initJolt>>;
