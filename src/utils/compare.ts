import type { FilesDiff } from './github'
import invariant from 'tiny-invariant'
import chalk from 'chalk'
import { getColor, toPercentage } from './formatters'

export type BranchComparison = ReturnType<typeof compareTwoBranches>
export const compareTwoBranches = (
  base: FilesDiff,
  comparison: FilesDiff,
  flags: {
    verbose: boolean
  }
) => {
  invariant(base?.files, `${base?.name} returned a null diff`)
  invariant(comparison, `${comparison?.name} returned a null diff`)

  let totalNOverlaps = 0
  for (const [filename, baseDiff] of base.files) {
    const comparisonDiff = comparison.files.get(filename)

    if (!baseDiff?.additions || !comparisonDiff?.additions) {
      continue
    }

    let nOverlaps = 0
    for (const line of baseDiff.additions) {
      /**
       * TODO: use a real algo
       * this is just a naive approach for now; most lines with just '}' will match
       */
      if (comparisonDiff.additions.includes(line)) {
        nOverlaps++
      }
    }
    if (flags.verbose) {
      const ratio = nOverlaps / baseDiff.numberOfAdditions
      console.log(
        getColor(ratio)(
          `${filename}: ${nOverlaps}/${baseDiff.numberOfAdditions}`
        )
      )
    }

    totalNOverlaps += nOverlaps
  }

  let totalAdditions = 0
  for (const [, diff] of base.files) {
    totalAdditions += diff.numberOfAdditions
  }

  if (flags.verbose) {
    const ratio = totalNOverlaps / totalAdditions
    const color = getColor(ratio)

    console.log(
      `${chalk.bold(base.name)} <-> ${chalk.bold(comparison.name)}: ${color(
        `${totalNOverlaps}/${totalAdditions} :: ${toPercentage(
          totalNOverlaps,
          totalAdditions
        )}`
      )}\n`
    )
  }

  return {
    base,
    comparison,
    ratio: totalNOverlaps / totalAdditions,
    totalNOverlaps,
    totalAdditions,
  }
}

export const filterNullDiffs = <T>(diffs: T[]) => {
  return diffs.filter((d): d is NonNullable<T> => d !== null)
}

export const createCompareLinks = ({
  org,
  repo,
  comparison,
}: {
  org: string
  repo: string
  comparison: BranchComparison
}) => {
  const baseUrl = `https://github.com/${org}/${repo}/compare/`

  return [
    `${baseUrl}main...${comparison.base.name}`,
    `${baseUrl}main...${comparison.comparison.name}`,
  ]
}