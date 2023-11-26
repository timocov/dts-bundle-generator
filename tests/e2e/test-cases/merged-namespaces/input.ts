import { Ns1 as F1Ns1 } from './ns1';
import { Ns1 as F2Ns1 } from './ns2';

export {
	Ns1 as F1Ns1,
	Ns2 as F1Ns2,
} from './ns1';

export {
	Ns1 as F2Ns1,
	Ns2 as F2Ns2,
} from './ns2';

export interface Int {
	f1: F1Ns1.SubNs1.Interface1;
	f2: F2Ns1.SubNs1.Interface1;
}
