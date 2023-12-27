namespace ExportEqNs {
	export namespace InternalNs {
		export type NewType = string;
	}

	export type Bar = ExportEqNs.Foo;
	export type Foo = String;

	export namespace InternalNs2 {
		export type Type21 = InternalNs3.Type31;
		export type Type22 = InternalNs2.InternalNs3.Type31;
		export type Type23 = ExportEqNs.InternalNs2.InternalNs3.Type31;

		export namespace InternalNs3 {
			export type Type31 = InternalNs4.Type;
			export type Type32 = InternalNs3.InternalNs4.Type;
			export type Type33 = InternalNs2.InternalNs3.InternalNs4.Type;
			export type Type34 = ExportEqNs.InternalNs2.InternalNs3.InternalNs4.Type;

			export namespace InternalNs4 {
				export type Type = string;
			}
		}
	}
}

export = ExportEqNs;
