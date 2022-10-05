#!/usr/bin/env ts-node
import compareOne from './src/commands/compare-one'
import init from './src/commands/init'
import compareAll from './src/commands/compare-all'
import appName from './src/app-name'
import { extractArgs } from './src/utils/extract-from-url'
import yargs from 'yargs'
import invariant from 'tiny-invariant'
import chalk from 'chalk'

yargs(process.argv.slice(2))
  .usage(`Usage: ${appName ?? '$0'} <url> [branch]`)
  .command(
    `$0 <url> [branch] [options]`,
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
        .option('all', {
          alias: 'A',
          type: 'boolean',
          default: false,
          description: 'compare all branches of the given repo',
        })
    },
    (argv) => {
      let { org, repo, branch } = extractArgs(argv.url as string)

      invariant(org, 'No org found in url 🤷')
      invariant(repo, 'No repo found in url 🤷')

      if (argv.all as boolean) {
        if (branch || argv.branch) {
          console.warn(
            chalk.yellow`🦜: Ignoring branch paramater when using --all | -A`
          )
        }
        compareAll({
          owner: org,
          repo,
          flags: {
            verbose: argv.verbose as boolean,
          },
        })
        return
      }

      if (!branch) {
        branch = argv.branch as string | undefined
      }

      invariant(
        branch,
        chalk.red`🦜: I couldn't find a branch, if you would like to compare all branches, use the --all | -A flag`
      )

      compareOne({
        owner: org,
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
