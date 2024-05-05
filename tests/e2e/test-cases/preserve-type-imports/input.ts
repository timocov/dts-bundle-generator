import type { Diagnostic, AffectedFileResult as RenamedImport } from "typescript";

export type MyType = {
  value: Diagnostic;
  alias: RenamedImport<number>
};
