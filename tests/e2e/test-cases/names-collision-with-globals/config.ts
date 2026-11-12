import type { TestCaseConfig } from '../test-case-config.ts';

const config: TestCaseConfig = {
    output: {
        inlineDeclareExternals: true,
        inlineDeclareGlobals: true
    }
};

export default config;
