import 'dotenv/config'
import { github } from './utils/github'
import { cohort, challenge, branch as branchToCompare } from './config'
import invariant from 'tiny-invariant'

// TODO: get these from args and fallback to defaults if --default/-D flag is given
const defaultOptions = {
  owner: cohort,
  repo: challenge,
  base: 'main',
}

export const excludedFiles = ['package-lock.json', 'package.json', 'README.md']

export const getDiff = async ({ branch }: { branch: string }) => {
  const { data } = await github.rest.repos.compareCommits({
    ...defaultOptions,
    head: branch,
    mediaType: {
      format: 'diff',
      previews: ['application/vnd.github.v3.diff'],
    },
  })

  if (!data.files || data.files?.length === 0) {
    return null
  }

  const filesArray = data.files
    .filter((f) => f && !excludedFiles.includes(f.filename))
    .map((f) => ({
      filename: f.status === 'renamed' ? f.previous_filename! : f.filename,
      diff: {
        patch: f.patch,
        additions: f.patch
          ?.split('\n')
          .filter((l) => l.startsWith('+'))
          .map((l) => l.slice(1)),
        numberOfAdditions: f.additions,
      },
    }))

  type FileDiff = typeof filesArray[number]
  const fileMap = new Map<FileDiff['filename'], FileDiff['diff']>()

  filesArray.forEach((f) => {
    fileMap.set(f.filename, f.diff)
  })

  return {
    name: branch,
    files: fileMap,
  }
}

export type FilesDiff = Awaited<ReturnType<typeof getDiff>>

export default async function main() {
  const { data: branches } = await github.rest.repos.listBranches({
    ...defaultOptions,
  })
  const branchNames = branches.map((b) => b.name)

  for (const currBranch of branchNames) {
    if (currBranch !== branchToCompare && currBranch !== 'main') {
      compareTwoBranches(branchToCompare, currBranch)
    }
  }
}

export const compareTwoBranches = async (from: string, to: string) => {
  // TODO: get base once, instead of in each comparison
  const base = await getDiff({ branch: from })
  const comparison = await getDiff({ branch: to })
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

main()
