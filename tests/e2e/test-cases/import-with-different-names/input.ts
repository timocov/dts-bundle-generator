import fakePackage1 from 'fake-package';
import * as fakePackage2 from 'fake-package';
import fakePackage3 = require('fake-package');

import { ExposedInterface } from './other-module';

export interface First extends fakePackage1.Interface {}
export interface Second extends fakePackage2.Interface {}
export interface Third extends fakePackage3.Interface {}

export { ExposedInterface };
