import * as winston from 'winston'
import { Queue } from './queue.js'
import { createFormatter } from './formats.js'
import columnify from 'columnify'

const timestamp = winston.format.timestamp({
  format: 'YYYY.MM.DD hh:mm:ss A',
})

const withColor = createFormatter(true)
const withoutColor = createFormatter(false)

const main = {
  logger: null as winston.Logger | null,
  queue: new Queue(),
}

type LoggerOptions = {
  file?: winston.transports.FileTransportOptions
  console?: winston.transports.ConsoleTransportOptions
  transports?: winston.transport[]
}

export class Logger {
  lastUpdated = Date.now()
  constructor(public label: string) {}

  log(level: string, message: string, ...args: unknown[]) {
    const now = Date.now()
    const diff = now - this.lastUpdated
    const logEntry: winston.LogEntry = {
      level,
      label: this.label,
      message,
      diff,
    }

    if (args.length > 0) {
      logEntry.meta = args
    }

    this.lastUpdated = now

    function logit() {
      main.logger?.log(logEntry)
    }

    if (main.logger != null) {
      logit()
    } else {
      main.queue.push(logit)
    }

    return this
  }

  info(message: string, ...args: unknown[]) {
    return this.log('info', message, ...args)
  }

  debug(message: string, ...args: unknown[]) {
    return this.log('debug', message, ...args)
  }

  warn(message: string, ...args: unknown[]) {
    return this.log('warn', message, ...args)
  }

  error<T extends Error>(message: string, err?: T) {
    return this.log('error', message, err)
  }
}

export default function logger(label: string) {
  return new Logger(label)
}

/**
 * Initializes the logger. Queues all log messages until the logger is initialized!
 * @param filename Required. Where to save the log file.
 * @param options Options, merged with defaults and passed directly to winston.
 */
logger.init = async (
  filename: string,
  opts: LoggerOptions | undefined = {}
) => {
  const fileOptions: winston.transports.FileTransportOptions = {
    handleExceptions: true,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
    format: winston.format.combine(timestamp, withoutColor),
    ...opts.file,
    filename,
  }

  const consoleOptions: winston.transports.ConsoleTransportOptions = {
    handleExceptions: true,
    format: winston.format.combine(timestamp, withColor),
    ...opts.console,
  }

  const transports: winston.transport[] = [
    new winston.transports.File(fileOptions),
    new winston.transports.Console(consoleOptions),
  ]

  if (opts.transports != null) {
    transports.push(...opts.transports)
  }

  main.logger = winston.createLogger({
    levels: winston.config.npm.levels,
    transports,
    exitOnError: false,
  })

  await main.queue.flush()
}
