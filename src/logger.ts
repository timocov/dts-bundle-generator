const enum LogLevel {
	Verbose,
	Normal,
	Error,
}

export function verboseLog(message: string): void {
	logMessage(message, LogLevel.Verbose);
}

export function normalLog(message: string): void {
	logMessage(message, LogLevel.Normal);
}

export function errorLog(message: string): void {
	logMessage(message, LogLevel.Error);
}

let currentLogLevel = LogLevel.Normal;

export function enableVerbose(): void {
	currentLogLevel = LogLevel.Verbose;
	normalLog('Verbose log enabled');
}

export function enableErrorsOnly(): void {
	currentLogLevel = LogLevel.Error;
}

function logMessage(message: string, level: LogLevel = LogLevel.Verbose): void {
	if (level < currentLogLevel) {
		return;
	}

	switch (level) {
		case LogLevel.Error:
			console.error(message);
			break;

		case LogLevel.Normal:
		case LogLevel.Verbose:
			console.log(message);
	}
}
