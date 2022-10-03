#!/usr/bin/env ts-node
import main from './main'
import { extractArgs } from './extract-from-url'
import yargs from 'yargs'
import invariant from 'tiny-invariant'

const parser = yargs(process.argv.slice(2))
  .usage('Usage: $0 <url> [branch]')
  .command('$0 <url> [branch]', 'compare branches', (yargs) => {
    yargs
      .positional('url', {
        type: 'string',
        describe: `url of github repo
        must be in the format: https://github.com/<org>/<repo>/tree/<branch-name>
        or https://github.com/<org>/<repo>
        where <branch-name> is provided as a second argument`,
      })
      .positional('branch', {
        type: 'string',
        describe: `branch to compare against
        only required if branch name not in url`,
      })
  })
  .help()

const argv = parser.parseSync()
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
})
