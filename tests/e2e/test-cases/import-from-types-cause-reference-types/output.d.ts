/// <reference types="fake-types-lib-2" />
/// <reference types="node" />

import { EventEmitter } from 'events';
import { Data } from 'fake-types-lib-2.5';

export interface ExtendedData extends Data {
}
export declare class MyEventEmitter extends EventEmitter {
}

export {};
