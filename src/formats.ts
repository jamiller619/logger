import chalk, { ChalkFunction } from 'chalk'
import * as winston from 'winston'
import process from 'node:process'
import util from 'node:util'
import pms from 'pretty-ms'
import { serializeError } from 'serialize-error'

const { levels } = winston.config.npm

const LogLevelColorMap = {
  [levels.error]: chalk.red,
  [levels.warn]: chalk.yellow,
  [levels.info]: chalk.cyan,
  [levels.debug]: chalk.green,
  [levels.verbose]: chalk.white,
  [levels.silly]: chalk.magenta,
}

type Meta = object | string | number | symbol

type TemplateParams = winston.Logform.TransformableInfo & {
  diff: number
  label: string
  meta?: Meta[]
  timestamp: string
}

const isObject = (value: unknown): value is object => {
  return typeof value === 'object' || typeof value === 'function'
}

export const createFormatter = (useColor = false) => {
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

    if (Number.isFinite(diff)) {
      body.push(colorize(`+${pms(diff, { compact: true })}`, chalk.dim))
    }

    return body.join(' ')
  }

  return winston.format.printf(
    print as (info: winston.Logform.TransformableInfo) => string
  )
}
