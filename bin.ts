#!/usr/bin/env ts-node
import compareOne from './src/commands/compare-one'
import init from './src/commands/init'
import compareAll from './src/commands/compare-all'
import appName from './src/app-name'
import { processGithubUrl } from './src/utils/github'
import yargs from 'yargs'
import invariant from 'tiny-invariant'
import chalk from 'chalk'
import { endLog, logComparisonResults } from './src/utils/chalkies'
import { BranchComparison, createCompareLinks } from './src/utils/compare'

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
          demandOption: true,
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
    async (argv) => {
      const url = argv.url as string
      let { org, repo, branch } = processGithubUrl(url)

      invariant(org, 'No org found in url 🤷')
      invariant(repo, 'No repo found in url 🤷')

      let comparisons: BranchComparison[] = []

      const shouldCompareAll = argv.all as boolean
      if (shouldCompareAll) {
        if (branch || argv.branch) {
          console.warn(
            chalk.yellow`🦜: Ignoring branch paramater when using --all | -A`
          )
        }
        comparisons = await compareAll({
          owner: org,
          repo,
          flags: {
            verbose: argv.verbose as boolean,
          },
        })
      } else {
        if (!branch) {
          branch = argv.branch as string | undefined
        }

        invariant(
          branch,
          chalk.red`🦜: I couldn't find a branch, if you would like to compare all branches, use the --all | -A flag`
        )

        comparisons = await compareOne({
          owner: org,
          repo,
          branch,
          flags: {
            verbose: argv.verbose as boolean,
          },
        })
      }

      logComparisonResults(comparisons)

      endLog(() => {
        const maxComparison = comparisons.at(-1)
        if (!maxComparison) return ''
        const links = createCompareLinks({
          org,
          repo,
          comparison: maxComparison,
        })
        return `Here's a link to the comparisons for the most similar branches:\n${links[0]}\n${links[1]}`
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
  .parseAsync()
