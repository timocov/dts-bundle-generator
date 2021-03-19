import { SomeInterface } from "./extendable-module";

// NOTE: if I do `import "./extender";` instead, it works slightly better
// but misses justFunction in the output
import { justFunction } from "./extender";

justFunction(true);

export default SomeInterface;
