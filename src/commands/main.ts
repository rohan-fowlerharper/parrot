import { FilesDiff, getDiff, github, GithubOptions } from '../utils/github'
import invariant from 'tiny-invariant'
import chalk from 'chalk'

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
  flags,
}: {
  branch: string
  org: string
  repo: string
  flags: {
    verbose: boolean
  }
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
      _compareTwoBranches(base, curr, githubOptions, flags)
    }
  }
}

export const _compareTwoBranches = async (
  base: FilesDiff,
  comparisonBranchName: string,
  options: GithubOptions,
  flags: {
    verbose: boolean
  }
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
    if (flags.verbose) {
      const color = getColor(nOverlaps, baseDiff.numberOfAdditions)
      console.log(
        color(`${filename}: ${nOverlaps}/${baseDiff.numberOfAdditions}`)
      )
    }

    totalNOverlaps += nOverlaps
  }

  let totalAdditions = 0
  for (const [, diff] of base.files) {
    totalAdditions += diff.numberOfAdditions
  }

  const color = getColor(totalNOverlaps, totalAdditions)
  console.log(
    `${chalk.bold(base.name)} <-> ${chalk.bold(comparison.name)}: ${color(
      `${totalNOverlaps}/${totalAdditions} :: ${(
        (totalNOverlaps / totalAdditions) *
        100
      ).toFixed(1)}%${flags.verbose && '\n'}`
    )}`
  )
}

const getColor = (nOverlaps: number, totalAdditions: number) => {
  const ratio = nOverlaps / totalAdditions
  if (ratio > 0.8) {
    return chalk.red.bold.underline
  }
  if (ratio > 0.4) {
    return chalk.red.bold
  }
  if (ratio > 0.2) {
    return chalk.yellow
  }
  if (ratio > 0.1) {
    return chalk.green
  }
  return chalk.gray
}
