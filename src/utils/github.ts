import { Octokit } from '@octokit/rest'
import appName from '../app-name'
import * as dotenv from 'dotenv'
dotenv.config({
  path: process.env.HOME + `/.${appName}/.env`,
})

const githubAccessToken = process.env.GITHUB_ACCESS_TOKEN
if (!githubAccessToken) {
  console.warn('No github access token found, please run `parrot init [token]`')
}
export const github = new Octokit({ auth: githubAccessToken })

export type GithubOptions = {
  owner: string
  repo: string
  base?: string
}

export type FilesDiff = Awaited<ReturnType<typeof getDiff>>
export const getDiff = async (branch: string, options: GithubOptions) => {
  if (branch === options.base) return null
  const { data } = await github.rest.repos.compareCommits({
    base: 'main',
    head: branch,
    mediaType: {
      format: 'diff',
      previews: ['application/vnd.github.v3.diff'],
    },
    ...options,
  })

  const uniqueAuthors = new Set(
    data.commits.map((c) => c.author?.login ?? c.commit.author?.name)
  )

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
    authors: uniqueAuthors,
  }
}

export const getBranchNames = async (owner: string, repo: string) => {
  const { data: branches } = await github.rest.repos.listBranches({
    owner,
    repo,
  })

  return branches.map((b) => b.name)
}

/**
 * takes a github url and extracts the org, repo, and branch (if available)
 * @param rawUrl
 * @returns org: string, repo: string, branch?: string
 */
export const processGithubUrl = (
  rawUrl: string
): {
  org: string
  repo: string
  branch?: string
} => {
  const url = new URL(rawUrl)
  const paths = url.pathname.split('/')
  paths.shift() // remove empty string

  if (paths.includes('tree')) {
    const [org, repo, , branch] = paths

    return {
      org,
      repo,
      branch,
    }
  }

  let [org, repo] = paths
  if (repo.includes('.git')) {
    repo = repo.slice(0, repo.length - 4)
  }
  return { org, repo }
}
