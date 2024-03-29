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

export type FilesDiff = {
  name: string
  files: Map<
    string,
    {
      patch: string | undefined
      additions: string[] | undefined
      numberOfAdditions: number
    }
  >
  authors: Set<string | undefined>
  pushedAt: string | undefined
} | null

export const getDiff = async (
  branch: string,
  options: GithubOptions
): Promise<FilesDiff> => {
  if (branch === options.base) return null

  try {
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
      pushedAt: data.commits[0].commit.author?.date,
    }
  } catch (err: any) {
    if (err.status === 404) {
      // this can happen when a branch has diverged histories from main
      return null
    }

    if (err.status === 403 && err.message.includes('secondary rate limit')) {
      const retryAfter = err.response.headers['retry-after']
      console.log('Rate limit exceeded, retrying in', retryAfter, 'seconds')
      await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000))
      return getDiff(branch, options)
    }

    throw err
  }
}

export const getAllRepos = async (cohort: string) => {
  try {
    return github.request('GET /orgs/{org}/repos', {
      org: cohort,
      per_page: 100,
    })
  } catch (err: any) {
    if (err.status === 403 && err.message.includes('secondary rate limit')) {
      const retryAfter = err.response.headers['retry-after']
      console.log('Rate limit exceeded, retrying in', retryAfter, 'seconds')
      await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000))
      return github.request('GET /orgs/{org}/repos', {
        org: cohort,
        per_page: 100,
      })
    }

    throw err
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

export const getActiveChallengeNames = async () => {
  const { data: challenges } = await github.rest.repos.getContent({
    owner: 'dev-academy-challenges',
    repo: 'challenges',
    path: 'packages',
  })

  if (!Array.isArray(challenges)) {
    return
  }

  return challenges.map((c) => c.name).filter((c) => !c.includes('solution'))
}
