import {
	Base as LocalBase,
	config as localConfig,
	constant as localConstant,
	Kind as LocalKind,
	symbolKey as localSymbolKey,
} from './others';

export namespace constantUsage {
	export const constant = 'other';
	export const usage: typeof localConstant = null as any;
}

export namespace classHeritage {
	export class Base { other: string = ''; }
	export class Derived extends LocalBase {}
}

export namespace computedKey {
	export const symbolKey = 'other';
	export interface WithKey { [localSymbolKey]: number; }
}

export namespace enumMember {
	export const Kind = 1;
	export type Usage = LocalKind.A;
}

export function withDefaultParameter(config = localConfig): void {}
