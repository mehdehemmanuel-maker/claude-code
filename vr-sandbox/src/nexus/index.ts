// The door into Nexus: one barrel that re-exports the engine, the book, the parts, the machines and everything
// built on them, so a caller writes `from '../nexus'` and nothing outside this directory has to know which of the
// fifteen directories a name lives in. It owns no concern of its own: every line here is an `export *`, and a new
// concern gets a file in the directory it belongs to (see CLAUDE.md, "Where the code lives") and a line here.
export * from './substrate/dimension';
export * from './substrate/status';
export * from './substrate/identity';
export * from './substrate/term';
export * from './substrate/evaluate';
export * from './substrate/law';
export * from './book';
export * from './substrate/solve';
export * from './substrate/field';
export * from './substrate/coupling';
export * from './substrate/realize';
export * from './substrate/observe';
export * from './substrate/journal';
export * from './substrate/runtime';
export * from './substrate/why';
export * from './substrate/beam';
