import { EventEmitter } from 'events';
import { SomeCoolInterface } from 'package-with-export-eq';
import { NamedDeclaration } from 'typescript';

export declare class StoppableEventEmitter extends EventEmitter {
	emitStoppableEvent(error: Error): this;
}
export type ExportType = SomeCoolInterface | NamedDeclaration | string;

export {};
