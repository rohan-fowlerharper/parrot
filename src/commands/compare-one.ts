import { getBranchNames, getDiff } from '../utils/github'
import { compareTwoBranches, filterNullDiffs } from '../utils/compare'
import chalk from 'chalk'
import { endLog, logComparisonResults } from '../utils/chalkies'
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
  flags,
}: {
  branch: string
  owner: string
  repo: string
  flags: {
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
      if (curr === branchToCompare) return null
      return getDiff(curr, { owner: owner, repo })
    })
  ).then(filterNullDiffs)

  const comparisons = diffsToCompare.map((diff) =>
    compareTwoBranches(baseDiff, diff, flags)
  )

  comparisons.sort(sortByRatio)

  logComparisonResults(comparisons)

  endLog(() => {
    const maxComparison = comparisons.at(-1)
    if (!maxComparison) return ''
    const baseLink = `https://github.com/${owner}/${repo}/compare/`
    const link = `${baseLink}${maxComparison?.base.name}...${maxComparison?.comparison.name}`
    const invertedLink = `${baseLink}${maxComparison?.comparison.name}...${maxComparison?.base.name}`
    return `See the most similar branch here:
    ${link}
    ${invertedLink}`
  })
}
