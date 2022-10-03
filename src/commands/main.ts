
import { FilesDiff, getDiff, github, GithubOptions } from '../utils/github'
import invariant from 'tiny-invariant'



console.log(process.env.GITHUB_TOKEN)

/**
 * usage:
 * `parrot https://github.com/org/repo/tree/branch-name`
 * or
 * `parrot https://github.com/org/repo [branch-name]`
 */
export default async function main({
  branch: branchToCompare,
  org,
  repo,
}: {
  branch: string
  org: string
  repo: string
}) {
  const githubOptions = {
    owner: org,
    repo: repo,
    base: 'main',
  } as const
  const { data: branches } = await github.rest.repos.listBranches(githubOptions)
  const branchNames = branches.map((b) => b.name)

  const base = await getDiff(branchToCompare, githubOptions)

  for (const curr of branchNames) {
    if (curr !== branchToCompare && curr !== 'main') {
      // TODO: collect results with Promise.all instead of logging inside function
      // TODO: report on any branches with alerting numbers of overlaps >60% or greatest overlap?
      _compareTwoBranches(base, curr, githubOptions)
    }
  }
}

export const _compareTwoBranches = async (
  base: FilesDiff,
  comparisonBranchName: string,
  options: GithubOptions
) => {
  const comparison = await getDiff(comparisonBranchName, options)

  invariant(base?.files, `${base?.name} returned a null diff`)
  invariant(comparison, `${comparison?.name} returned a null diff`)

  let totalNOverlaps = 0
  for (const [filename, baseDiff] of base.files) {
    const comparisonDiff = comparison.files.get(filename)

    if (!comparisonDiff) {
      continue
    }

    const baseAdditions = baseDiff.additions
    const comparisonAdditions = comparisonDiff.additions

    invariant(baseAdditions, `no additions for ${base.name} -> ${filename}`)
    invariant(
      comparisonAdditions,
      `no additions for ${comparison.name} -> ${filename}`
    )

    let nOverlaps = 0
    for (const line of baseAdditions) {
      /**
       * TODO: use a real algo
       * this is just a naive approach for now; most lines with just '}' will match
       */
      if (comparisonAdditions.includes(line)) {
        nOverlaps++
      }
    }
    console.log(
      `${filename}: ${nOverlaps}/${baseDiff.numberOfAdditions} additions overlap`
    )
    totalNOverlaps += nOverlaps
  }

  let totalAdditions = 0
  for (const [, diff] of base.files) {
    totalAdditions += diff.numberOfAdditions
  }

  console.log(
    `Total overlaps, ${base.name} -> ${comparison.name}: ${totalNOverlaps}/${totalAdditions}\n`
  )
}
