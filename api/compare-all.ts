import type { VercelRequest, VercelResponse } from '@vercel/node'
import compareAll from '../src/commands/compare-all'
import { processGithubUrl } from '../src/utils/github'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    res.status(405).send({ success: false, message: 'Method Not Allowed' })
    return
  }

  if (req.headers.authorization !== `Bearer ${process.env.API_SECRET_KEY}`) {
    res.status(401).json({ success: false, message: 'Unauthorized' })
    return
  }

  let org: string | undefined
  let repo: string | undefined

  try {
    // TODO: add some basic type validation here, maybe with zod
    if (req.query.url) {
      const urlData = processGithubUrl(req.query.url as string)
      org = urlData.org
      repo = urlData.repo
    } else {
      org = req.query.org as string
      repo = req.query.repo as string
    }

    if (!org || !repo) {
      // TODO: add more informative error message
      res.status(400).json({
        success: false,
        message: 'Malformed input, check url or org/repo',
      })
      return
    }

    const comparisons = await compareAll({
      owner: org,
      repo: repo,
    })

    res.status(200).json({ success: true, comparisons })
  } catch (err) {
    if (err instanceof Error) {
      console.log(err)
      res.status(500).json({ success: false, message: err.message })
    } else {
      res.status(500).json({ success: false, message: 'Internal Server Error' })
    }
  }
}
