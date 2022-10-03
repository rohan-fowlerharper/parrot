import appName from '../app-name'
import fs from 'node:fs/promises'
import path from 'node:path'

export default async function init({ token }: { token?: string }) {
  const envPath = path.join(
    process.env.PARROT_DIRECTORY ?? process.env.HOME ?? '~',
    `.${appName}`,
    '.env'
  )
  const envDir = path.dirname(envPath)

  await fs.mkdir(envDir, { recursive: true })
  console.log(`Created new config file at ${envPath}`)
  await fs.writeFile(envPath, `GITHUB_ACCESS_TOKEN="${token ?? ''}"\n`)
  console.log(`Wrote GITHUB_ACCESS_TOKEN to ${envPath}`)
}
