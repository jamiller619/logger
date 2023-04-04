import * as winston from 'winston'
import { Queue } from './queue'
import { createFormatter } from './formats'

const timestamp = winston.format.timestamp({
  format: 'YYYY.MM.DD HH:mm:ss A',
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
  transports: winston.transport[]
}

export const init = async (
  { file, console, transports }: LoggerOptions = { transports: [] }
) => {
  if (!file?.filename) {
    throw new Error('Filename is required!')
  }

  const fileOptions: winston.transports.FileTransportOptions = {
    handleExceptions: true,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
    format: winston.format.combine(timestamp, withoutColor),
    ...file,
  }

  const consoleOptions: winston.transports.ConsoleTransportOptions = {
    handleExceptions: true,
    format: winston.format.combine(timestamp, withColor),
    ...console,
  }

  main.logger = winston.createLogger({
    levels: winston.config.npm.levels,
    transports: [
      new winston.transports.File(fileOptions),
      new winston.transports.Console(consoleOptions),
      ...transports,
    ],
    exitOnError: false,
  })

  await main.queue.flush()
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

    const logit = () => {
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
