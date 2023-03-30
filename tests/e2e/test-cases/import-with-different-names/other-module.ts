import fakePackageDifferentNameThatShouldNotBeAddedToOutput = require('fake-package');
import PackageWithExportEq = require('package-with-export-eq');

export interface OtherInternalInterface extends fakePackageDifferentNameThatShouldNotBeAddedToOutput.Interface {}

export interface ExposedInterface extends PackageWithExportEq.SomeCoolInterface {}
