import chalk from 'chalk'
import type { BranchComparison } from './compare'
import { getColor, toFraction, toPercentage } from './formatters'

type ExtendedBranchComparison = BranchComparison & {
  repo?: string
}

export const logComparisonResults = (
  comparisons: ExtendedBranchComparison[]
) => {
  if (comparisons[0]?.repo) {
    console.log(
      chalk`{bold 🦜: Comparison for {green ${comparisons.length}} branches} in {bold.green ${comparisons[0].repo}}`
    )
  }
  comparisons.forEach((diff) => {
    console.log(
      chalk`${getColor(diff.ratio)(
        `${toPercentage(diff.ratio).padEnd(5)} :: ${toFraction(
          diff.totalNOverlaps,
          diff.totalAdditions
        ).padEnd(9)}`
      )} :: {bold ${diff.base.name}} --- {bold ${diff.comparison.name}}`
    )
  })
}

export const endLog = (message?: string | null | (() => string | null)) => {
  if (typeof message === 'function') {
    message = message()
  }
  console.log(chalk`{bold.green 🦜: Chirp Chirp! All done... ${message ?? ''}}`)
}