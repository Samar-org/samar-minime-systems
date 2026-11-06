import pino from 'pino';

let logLevel = process.env['LOG_LEVEL'] || 'info';

const baseLogger = pino({
  level: logLevel,
  redact: { paths: ['apiKey', 'authorization', 'password', 'secret', 'token'], censor: '[REDACTED]' },
});

const loggers: Record<string, pino.Logger> = {};

export function getLogger(name: string): pino.Logger {
  if (!loggers[name]) {
    loggers[name] = baseLogger.child({ module: name });
  }
  return loggers[name]!;
}

export function setLogLevel(level: string): void {
  logLevel = level;
  baseLogger.level = level;
}
