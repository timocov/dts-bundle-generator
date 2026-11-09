/// <reference path="./ambient.d.ts" preserve="true" />

import { Date, Error as AliasedError } from 'package-with-export-eq-namespace';

export type LocalDate = Date;
export type LocalError = AliasedError;
export type FromAmbient = import('ambient-module').Ambient;
