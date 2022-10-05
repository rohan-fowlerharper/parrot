import { getBranchNames, getDiff } from '../utils/github'
import chalk from 'chalk'
import {
  BranchComparison,
  compareTwoBranches,
  filterNullDiffs,
} from '../utils/compare'
import { endLog, logComparisonResults } from '../utils/chalkies'
import { sortByRatio } from '../utils/formatters'

export default async function compareAll({
  owner,
  repo,
  flags,
}: {
  owner: string
  repo: string
  flags: {
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

  logComparisonResults(comparisons)

  endLog(() => {
    const maxComparison = comparisons.at(-1)
    if (!maxComparison) return ''
    const baseLink = `https://github.com/${owner}/${repo}/compare/`
    const link = `${baseLink}${maxComparison?.base.name}...${maxComparison?.comparison.name}`
    const invertedLink = `${baseLink}${maxComparison?.comparison.name}...${maxComparison?.base.name}`
    return `Here's a link to the comparisons for the most similar branches:
    ${link}
    ${invertedLink}`
  })
}
