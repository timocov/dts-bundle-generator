/**
 * @param param function to execute
 * @returns execution time (in milliseconds)
 */
export function measureTime(func: () => void): number {
	const startAt = process.hrtime();
	func();
	const resultValue = process.hrtime(startAt);
	return secondsToMs(resultValue[0]) + nanosecondsToMs(resultValue[1]);
}

function secondsToMs(value: number): number {
	return value * 1000;
}

function nanosecondsToMs(value: number): number {
	return value / 1000000;
}
