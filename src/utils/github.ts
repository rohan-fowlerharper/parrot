import { Octokit } from '@octokit/rest'
import invariant from 'tiny-invariant'
import * as dotenv from 'dotenv'
dotenv.config({
  path: process.env.HOME + '/.parrot/.env',
})

const githubAccessToken = process.env.GITHUB_ACCESS_TOKEN
if (!githubAccessToken) {
  console.warn('No github access token found, please run `parrot init [token]`')
}
export const github = new Octokit({ auth: githubAccessToken })

export type GithubOptions = {
  owner: string
  repo: string
  base: 'main' | 'dev'
}

export type FilesDiff = Awaited<ReturnType<typeof getDiff>>
export const getDiff = async (branch: string, options: GithubOptions) => {
  const { data } = await github.rest.repos.compareCommits({
    ...options,
    head: branch,
    mediaType: {
      format: 'diff',
      previews: ['application/vnd.github.v3.diff'],
    },
  })

  if (!data.files || data.files?.length === 0) {
    return null
  }

  const excludedFiles = ['package-lock.json', 'package.json', 'README.md']
  const filesArray = data.files
    .filter((f) => f && !excludedFiles.includes(f.filename))
    .map((f) => ({
      filename: f.status === 'renamed' ? f.previous_filename! : f.filename,
      diff: {
        patch: f.patch,
        additions: f.patch
          ?.split('\n')
          .filter((l) => l.startsWith('+'))
          .map((l) => l.slice(1)),
        numberOfAdditions: f.additions,
      },
    }))

  type FileDiff = typeof filesArray[number]
  const fileMap = new Map<FileDiff['filename'], FileDiff['diff']>()

  filesArray.forEach((f) => {
    fileMap.set(f.filename, f.diff)
  })

  return {
    name: branch,
    files: fileMap,
  }
}