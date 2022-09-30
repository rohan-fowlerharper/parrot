import { Octokit } from '@octokit/rest'
import invariant from 'tiny-invariant'

const githubAccessToken = process.env.GITHUB_ACCESS_TOKEN
invariant(githubAccessToken, 'GITHUB_ACCESS_TOKEN is required')
export const github = new Octokit({ auth: githubAccessToken })
