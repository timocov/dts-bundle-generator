interface Resolved {
	field: string;
}
interface OnlyUsedAsTypeArgument {
	other: number;
}
interface OnlyUsedAsNestedTypeArgument {
	nested: boolean;
}
// a library might check for optional modules in its typings
// @ts-ignore
export type Optional = import("optional-module").Namespace.Type | import("another-optional-module").Type;
// @ts-ignore
export type WithTypeArgument = import("optional-module").Generic<OnlyUsedAsTypeArgument>;
export type Mixed = Resolved | Optional;
// @ts-ignore
export type Nested = import("optional-module").Type<import("another-optional-module").Bar>;
// @ts-ignore
export type DeeplyNested = import("optional-module").Type<import("another-optional-module").Bar<OnlyUsedAsNestedTypeArgument>, Resolved>;

export {};
