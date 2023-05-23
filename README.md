# logger

> The winston-based logger I use for my personal projects.

## Features

- Works with multiple module formats:
  - ESM `import`
  - CommonJS `require` <sup>_(thx Electron!)_</sup>
- Built-in TypeScript definitions
- Properly formatted objects and arrays

## Install

The package is installed via Github, mainly because I like using
the `logger` name for imports, which wouldn't be possible if
it was published to npm.

Because the package is a git repo, the installer needs to
run a build script to produce the necessary files in the
`dist` folder. The following command will do just that, in
npm or yarn classic (although I haven't tested it in npm yet).

```sh
yarn add git+https://github.com/jamiller619/logger.git
```

This will add the package to your `package.json` file and
run the `prepare` script to produce the final package.

**This will NOT work in yarn berry!** The syntax to add git
repos as a package, I believe, is different, in addition to
changing the name of the script to run the build from
`prepare` to `something-else` (I don't remember what).

## Usage

```ts
import logger from 'logger'

// Obviously, this won't work in cjs,
// but you can figure it out...
await logger.init('./path/to/my.log')

const log = logger('some.namespace')

log.info('a message here', 'some more info?', {
  even: 'an object will work!',
})

log.error(
  'Mundane detail',
  new Error('I must have put a decimal in the wrong place. I always do that')
)
```

The important thing here to remember is that the logger
**MUST BE INITIALIZED!** It doesn't even matter where or
when, because all messages that happen before `init` is
called are queued. You just won't see any logs in the
console or file, until `init` is called.

### Init

The `init` function accepts two parameters, the path to the
log file, and an options object. Any options passed into
`init` are merged with defaults and passed directly to winston.

### Namespace

Calling the default export of `logger` produces an object
with the usual suspects: `.info()`, `.debug()`, etc. What
you pass into that function will serve as the `namespace`
for all messages logged by the object.

### Messages

The first argument to all log calls is the `message`
parameter, which must be a string. All other parameters can
be anything, and will be properly serialized for the console
and/or file. The only exception to this is `log.error`,
which only accepts two parameters with the second
being an instance of an `Error` object.

## The logs

Using the examples above will print the following (except with
colors):

```sh
2023.05.21 10:25:38 PM INFO [some.namespace] (34504): a message here some more info? {
  even: "an object will work!"
} +0ms
2023.05.21 10:25:38 PM ERROR [some.namespace] (34504): Mundane detail {
  name: "Error",
  message: "I must have put a decimal in the wrong place. I always do that",
  stack: ""
} +0ms
```
