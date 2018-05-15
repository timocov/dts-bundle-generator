import { EventEmitter } from 'events';
import { SomeCoolInterface } from 'package-with-export-eq';
import { NamedDeclaration } from 'typescript';

export declare class StoppableEventEmitter extends EventEmitter {
	emitStoppableEvent(): this;
}
export declare type ExportType = SomeCoolInterface | NamedDeclaration | string;
