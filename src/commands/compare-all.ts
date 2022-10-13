import { getBranchNames, getDiff } from '../utils/github'
import chalk from 'chalk'
import {
  BranchComparison,
  compareTwoBranches,
  filterNullDiffs,
} from '../utils/compare'
import { sortByRatio } from '../utils/formatters'

export default async function compareAll({
  owner,
  repo,
  flags = { verbose: false },
}: {
  owner: string
  repo: string
  flags?: {
    verbose: boolean
  }
}) {
  const branchNames = await getBranchNames(owner, repo)

  console.log(
    chalk`{bold 🦜: Comparing {green ${branchNames.length}} branches} for {bold.green ${repo}} in {bold.green ${owner}}`
  )

  const diffs = await Promise.all(
    branchNames.map(async (branch) => getDiff(branch, { owner, repo }))
  ).then(filterNullDiffs)

  const comparisons = [] as BranchComparison[]
  for (let i = 0; i < diffs.length; i++) {
    const baseDiff = diffs[i]

    for (let j = i + 1; j < diffs.length; j++) {
      const diffToCompare = diffs[j]

      const comparison = compareTwoBranches(baseDiff, diffToCompare, flags)
      comparisons.push(comparison)
    }
  }

  comparisons.sort(sortByRatio)

  return comparisons
}
