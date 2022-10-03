export const extractArgs = (rawUrl: string) => {
  const url = new URL(rawUrl)
  const paths = url.pathname.split('/')
  paths.shift() // remove empty string

  if (paths.includes('tree')) {
    const [org, repo, , branch] = paths

    return {
      org,
      repo,
      branch,
    }
  }

  let [org, repo] = paths
  if (repo.includes('.git')) {
    repo = repo.slice(0, repo.length - 4)
  }
  return { org, repo }
}
