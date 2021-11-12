const enum LogLevel {
	Verbose,
	Normal,
	Warning,
	Error,
}

export function verboseLog(message: string): void {
	logMessage(message, LogLevel.Verbose);
}

export function normalLog(message: string): void {
	logMessage(message, LogLevel.Normal);
}

export function warnLog(message: string): void {
	logMessage(message, LogLevel.Warning);
}

export function errorLog(message: string): void {
	logMessage(message, LogLevel.Error);
}

let currentLogLevel = LogLevel.Error;

export function enableVerbose(): void {
	currentLogLevel = LogLevel.Verbose;
	normalLog('Verbose log enabled');
}

export function enableNormalLog(): void {
	currentLogLevel = LogLevel.Normal;
}

function logMessage(message: string, level: LogLevel = LogLevel.Verbose): void {
	if (level < currentLogLevel) {
		return;
	}

	switch (level) {
		case LogLevel.Error:
			// print red
			// eslint-disable-next-line no-console
			console.error(`\x1b[0;31m${message}\x1b[0m`);
			break;

		case LogLevel.Warning:
			// eslint-disable-next-line no-console
			console.warn(`\x1b[1;33m${message}\x1b[0m`);
			break;

		case LogLevel.Normal:
		case LogLevel.Verbose:
			// eslint-disable-next-line no-console
			console.log(message);
	}
}
