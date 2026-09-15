type LogFields = Record<string, unknown>;

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

function write(level: LogLevel, message: string, fields: LogFields = {}): void {
  const record = JSON.stringify({ level, message, time: new Date().toISOString(), ...fields });
  if (level === 'error') console.error(record);
  else if (level === 'warn') console.warn(record);
  else console.log(record);
}

export const logger = {
  debug: (message: string, fields?: LogFields) => write('debug', message, fields),
  info: (message: string, fields?: LogFields) => write('info', message, fields),
  warn: (message: string, fields?: LogFields) => write('warn', message, fields),
  error: (message: string, fields?: LogFields) => write('error', message, fields),
};
