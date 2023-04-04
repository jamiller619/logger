import process from 'node:process'
import util from 'node:util'
import chalk, { ChalkFunction } from 'chalk'
import pms from 'pretty-ms'
import { serializeError } from 'serialize-error'
import * as winston from 'winston'
import { Queue } from './queue'

type Meta = object | string | number | symbol

const timestamp = winston.format.timestamp({
  format: 'YYYY.MM.DD HH:mm:ss A',
})

const { levels } = winston.config.npm

const LogLevelColorMap = {
  [levels.error]: chalk.red,
  [levels.warn]: chalk.yellow,
  [levels.info]: chalk.cyan,
  [levels.debug]: chalk.green,
  [levels.verbose]: chalk.white,
  [levels.silly]: chalk.magenta,
}

type TemplateParams = winston.Logform.TransformableInfo & {
  diff: number
  label: string
  meta?: Meta[]
  timestamp: string
}

const isObject = (value: unknown): value is object => {
  return typeof value === 'object' || typeof value === 'function'
}

const createFormatter = (useColor = false) => {
  const colorize = (text: string, ck?: ChalkFunction) => {
    return useColor && ck instanceof Function ? ck(text) : text
  }

  const print = ({
    diff,
    label,
    level,
    message,
    meta,
    timestamp,
  }: TemplateParams) => {
    const levelColor = LogLevelColorMap[levels[level]] ?? chalk.dim
    const header: string[] = [
      colorize(timestamp, chalk.dim),
      colorize(level.toUpperCase(), levelColor),
      colorize(`[${label}]`, chalk.white),
      colorize(`(${process.pid}):`, chalk.dim),
    ]

    const body: string[] = [header.join(' '), colorize(message, chalk.yellow)]

    if (meta != null) {
      for (const item of meta) {
        if (isObject(item)) {
          const data = level === 'error' ? serializeError(item) : item

          body.push(
            util.inspect(data, {
              colors: useColor,
            })
          )
        } else {
          body.push(
            ...meta.map((m) => colorize(JSON.stringify(m, null, 2), chalk.gray))
          )
        }
      }
    }

    body.push(colorize(`+${pms(diff, { compact: true })}`, chalk.dim))

    return body.join(' ')
  }

  return winston.format.printf(
    print as (info: winston.Logform.TransformableInfo) => string
  )
}

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
    levels,
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
