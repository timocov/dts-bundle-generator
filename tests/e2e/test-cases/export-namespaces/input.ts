import { InternalModule, InternalNamespace, ExportedModule, ExportedNamespace } from './internals';

export type A = InternalModule.MType;
export type B = InternalNamespace.NSType;

export { ExportedModule, ExportedNamespace };
