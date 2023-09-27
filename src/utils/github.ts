import * as github from '@actions/github'

export interface GithubContextData {
  owner: string
  repo: string
  actor: string
  sha: string
  shortSha: string
  issueNumber: number
  blobBaseUrl: string
  commitUrl: string
}

export const escapeTextForGithub = (input: string): string => {
  let output = input

  // Escape GitHub Usernames tags
  output = input.replace(/@([a-zA-Z0-9-]+)/g, '`@$1`')

  return output
}

export const getGithubContext = (): GithubContextData => {
  const { repo: repoData, issue, sha, actor } = github.context

  if (!repoData) {
    throw new Error('Missing Github Context data')
  }

  const { owner, repo } = repoData

  const shortSha = (sha || '').slice(0, 7)
  const blobBaseUrl = `https://github.com/${owner}/${repo}/blob/${sha}`
  const commitUrl = `https://github.com/${owner}/${repo}/commit/${sha}`

  return {
    owner,
    repo,
    actor,
    sha,
    shortSha,
    issueNumber: issue.number,
    blobBaseUrl,
    commitUrl
  }
}
