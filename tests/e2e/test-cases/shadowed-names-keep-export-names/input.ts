import { fn as localFn } from './others';

export { fn, Target } from './others';
export { fn as default } from './others';

export function expando() {}
expando.fn = localFn;

export type WithTypeParameter<Target> = import('./others').Target | Target;
