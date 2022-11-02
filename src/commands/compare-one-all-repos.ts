import {
  getActiveChallengeNames,
  getBranchNames,
  getDiff,
  github,
} from '../utils/github'
import invariant from 'tiny-invariant'
import {
  BranchComparison,
  compareTwoBranches,
  filterNullDiffs,
} from '../utils/compare'
import { sortByRatio } from '../utils/formatters'
import chalk from 'chalk'

/**
 * usage:
 * `parrot student aihe-popoto-2022 ben`
 * `parrot student <cohort> <branch-name>`
 */
export default async function compareOneAllRepos({
  branch: studentBranchName,
  owner: cohort,
  flags,
}: {
  branch: string
  owner: string
  flags: {
    verbose: boolean
  }
}) {
  const activeChallenges = await getActiveChallengeNames()

  invariant(activeChallenges, 'Could not get active challenges')

  const { data: allRepos } = await github.request('GET /orgs/{org}/repos', {
    org: cohort,
    per_page: 100,
  })
  const repos = allRepos.filter((r) => activeChallenges.includes(r.name))

  console.log(
    chalk`🦜: Checking ${repos.length} repos for branches containing {green ${studentBranchName}}... This may take some time.`
  )

  const results = new Map<string, BranchComparison[]>()
  for (const repo of repos) {
    const branchNames = await getBranchNames(cohort, repo.name)

    const matchingBranches = branchNames.filter((b) =>
      b.toLowerCase().includes(studentBranchName)
    )

    if (matchingBranches.length === 0) {
      continue
    }

    console.log(
      chalk`🦜: Found ${matchingBranches.length} matching branch${
        matchingBranches.length > 1 ? 'es' : ''
      } in {green ${repo.name}}... Comparing to {green ${
        branchNames.length
      }} other branches.`
    )

    const baseDiffs = await Promise.all(
      matchingBranches.map((b) => {
        return getDiff(b, { owner: cohort, repo: repo.name })
      })
    )

    const diffsToCompare = await Promise.all(
      branchNames.map(async (b) => {
        if (matchingBranches.includes(b) || b === 'main') {
          return null
        }
        return getDiff(b, { owner: cohort, repo: repo.name })
      })
    ).then(filterNullDiffs)

    const comparisons = baseDiffs
      .map((base) => {
        return diffsToCompare.map((diff) => {
          return compareTwoBranches(base, diff, flags)
        })
      })
      .flat()
      .sort(sortByRatio)

    results.set(repo.name, comparisons)
  }

  return results
}
