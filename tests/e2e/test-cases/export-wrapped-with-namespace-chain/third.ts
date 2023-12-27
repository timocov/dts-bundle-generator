import * as Ns1 from 'package-with-export-eq';

export type A = string;

export * as Ns from 'fake-package';

export { Ns1 };

// this is not supported yet, uncomment once it is possible
// export * from 'fake-package';
