#!/usr/bin/env ts-node
import main from './src/commands/main'
import init from './src/commands/init'
import appName from './src/app-name'
import { extractArgs } from './src/utils/extract-from-url'
import yargs from 'yargs'
import invariant from 'tiny-invariant'

yargs(process.argv.slice(2))
  .usage(`Usage: ${appName ?? '$0'} <url> [branch]`)
  .command(
    `$0 <url> [branch]`,
    'compare branches',
    (yargs) => {
      yargs
        .positional('url', {
          type: 'string',
          describe: `url of github repo
        must be in the format: https://github.com/<org>/<repo>/tree/<branch-name>
        or https://github.com/<org>/<repo>
        where <branch-name> is provided as a second argument\n`,
        })
        .positional('branch', {
          type: 'string',
          describe: `branch to compare against
        only required if branch name not in url`,
        })
        .option('verbose', {
          alias: 'v',
          type: 'boolean',
          default: false,
          description: 'show more output',
        })
    },
    (argv) => {
      // NOTE: this is a bit of a hack to process args, I'm sure yargs lets us do this with middleware
      let { org, repo, branch } = extractArgs(argv.url as string)
      if (!branch) {
        branch = argv.branch as string | undefined
      }

      invariant(org, 'No org provided')
      invariant(repo, 'No repo provided')
      invariant(branch, 'No branch provided')

      main({
        org,
        repo,
        branch,
        flags: {
          verbose: argv.verbose as boolean,
        },
      })
    }
  )
  .command(
    'init [token]',
    `initialize a new ${appName} config file`,
    (yargs) => {
      yargs
        .option('token', {
          alias: 't',
          type: 'string',
          describe:
            'your github access token, this should have admin:org scope',
        })
        .positional('token', {
          type: 'string',
          describe:
            'your github access token, this should have admin:org scope',
        })
    },
    (argv) => {
      init({ token: argv.token as string | undefined })
    }
  )
  .help()
  .parseSync()
