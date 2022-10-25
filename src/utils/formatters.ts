import chalk from 'chalk'

export const toFraction = (a: number, b: number) => {
  return `${a}/${b}`
}

export const getColor = (ratio: number) => {
  if (ratio > 0.8) {
    return chalk.red.bold
  }
  if (ratio > 0.55) {
    return chalk.red
  }
  if (ratio > 0.4) {
    return chalk.yellow
  }
  if (ratio > 0.3) {
    return chalk.green
  }
  return chalk.gray
}

export function toPercentage(a: number, b: number): string
export function toPercentage(a: number): string
export function toPercentage(a: number, b?: number) {
  if (b !== undefined) {
    return `${((a / b) * 100).toFixed(1)}%`
  }
  return `${(a * 100).toFixed(1)}%`
}

export const sortByRatio = (a: { ratio: number }, b: { ratio: number }) =>
  a.ratio - b.ratio
