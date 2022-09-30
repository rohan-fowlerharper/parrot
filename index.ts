// cohort name
// challenge name
// branch name -> compare to main first, and then every other branch?

// check function to compare two branches for overlapping code
// ignore files that are not .js/.jsx/.ts/.tsx/.hbs
// ignore loc that are from original challenge files

// what does output look like?
// ---------------------------
// Challenge: memory
// Branch: rohan-x
// Cohort: Aihe 2021
// File: src/components/Board.js
// Turnitin: 0.7
// blah blah blah
import 'dotenv/config'
import fetch from 'node-fetch'
import { github } from './utils/github'
import { cohort, challenge } from './config'
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
      filename: f.filename,
      diff: {
        raw: f.patch,
        additions: f.patch
          ?.split('\n')
          .filter((l) => l.startsWith('+'))
          .map((l) => l.slice(1)),
      },
    }))

  type FileDiff = typeof filesArray[number]
  const fileMap = new Map<FileDiff['filename'], FileDiff['diff']>()

  filesArray.forEach((f) => {
    if (f.diff.raw) {
      fileMap.set(f.filename, f.diff)
    }
  })

  return fileMap
}

export default async function main() {
  const { data: branches } = await github.rest.repos.listBranches({
    ...defaultOptions,
  })
  const branchNames = branches.map((b) => b.name)

  // TODO: get this from args
  const branchToCompare = 'rohan'

  for (const branch of branchNames) {
    if (branch !== branchToCompare && branch !== 'main') {
      compareTwoBranches(branch, branchToCompare)
    }
  }
}

export const compareTwoBranches = async (from: string, to: string) => {
  const diff1 = await getDiff({ branch: from })
  const diff2 = await getDiff({ branch: to })

  invariant(diff1, `${from} returned a null diff`)
  invariant(diff2, `${to} returned a null diff`)

  let totalNOverlaps = 0
  for (const [filename, diff1Patch] of diff1.entries()) {
    const diff2Patch = diff2.get(filename)

    if (!diff2Patch) {
      continue
    }

    const diff1Lines = diff1Patch.additions
    const diff2Lines = diff2Patch.additions

    invariant(diff1Lines, `no additions for ${from} -> ${filename}`)
    invariant(diff2Lines, `no additions for ${to} -> ${filename}`)

    let nOverlaps = 0
    for (const line of diff1Lines) {
      /**
       * TODO: use a real algo
       * this is just a naive approach for now; most lines with just '}' will match
       */
      if (diff2Lines.includes(line)) {
        nOverlaps++
      }
    }
    console.log(
      `${filename}: ${nOverlaps}/${
        diff1Patch.additions?.length
      } additions overlap in a file with ${
        diff1Patch.raw?.split('\n').length
      } lines`
    )
    totalNOverlaps += nOverlaps
  }
  const totalLines = Array.from(diff1.values()).reduce(
    (acc, curr) => acc + (curr.additions?.length ?? 0),
    0
  )
  console.log(
    `Total overlaps, ${from} -> ${to}: ${totalNOverlaps}/${totalLines}\n`
  )
}

main()
