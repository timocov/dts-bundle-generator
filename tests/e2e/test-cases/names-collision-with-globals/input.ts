import { Date as LocalDate, Promise as LocalPromise } from './local-types';

export interface Int {
	localD: LocalDate;
	globalD: Date;

	localP: LocalPromise;
	globalP: Promise<number>;
}
