import { getBranchNames, getDiff } from '../utils/github'
import { compareTwoBranches, filterNullDiffs } from '../utils/compare'
import chalk from 'chalk'
import { sortByRatio } from '../utils/formatters'

/**
 * usage:
 * `parrot https://github.com/org/repo/tree/branch-name`
 * or
 * `parrot https://github.com/org/repo [branch-name]`
 */
export default async function compareOne({
  branch: branchToCompare,
  owner,
  repo,
  flags = { verbose: false },
}: {
  branch: string
  owner: string
  repo: string
  flags?: {
    verbose: boolean
  }
}) {
  const branchNames = await getBranchNames(owner, repo)

  console.log(
    chalk`{bold Comparing branch {green ${branchToCompare}} to {green ${branchNames.length} branches} } for {bold.green ${repo}} in {bold.green ${owner}}`
  )

  const baseDiff = await getDiff(branchToCompare, {
    owner: owner,
    repo,
  })

  const diffsToCompare = await Promise.all(
    branchNames.map(async (curr) => {
      if (curr === branchToCompare || curr === 'main') return null
      return getDiff(curr, { owner: owner, repo })
    })
  ).then(filterNullDiffs)

  const comparisons = diffsToCompare.map((diff) =>
    compareTwoBranches(baseDiff, diff, flags)
  )

  comparisons.sort(sortByRatio)

  return comparisons
}
