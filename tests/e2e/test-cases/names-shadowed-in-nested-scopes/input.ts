import defaultFn from './default-export';
import { renamed } from './renamed-export';
import { aliased as localAlias } from './aliased-import';
import * as ns from './namespace-import';

export function expando() {}
expando.defaultFn = defaultFn;
expando.original = renamed;
expando.viaNs = ns.viaNs;

export namespace explicit {
	export const aliased: typeof localAlias = localAlias;
}

export namespace merged {
	export const inFirstBlock = 2;
}

export namespace merged {
	export const usage: typeof import('./others').inFirstBlock = null as any;
}

export namespace Dotted.inner {
	export const usage: typeof import('./others').inner = null as any;
}

export type WithTypeParameter<Target> = import('./others').Target | Target;

export declare function withParameter(param: typeof import('./others').param): void;
