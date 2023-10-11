import * as github from '@actions/github'
import { PullRequestEvent } from '@octokit/webhooks-definitions/schema'
import { createAppAuth } from '@octokit/auth-app'
import { Octokit } from '@octokit/rest'

import { configInputs } from '../config'

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
let githubContextData: GithubContextData | undefined

export const escapeTextForGithub = (input: string): string => {
  let output = input

  // Escape GitHub Usernames tags
  output = input.replace(/@([a-zA-Z0-9-]+)/g, '`@$1`')

  return output
}

export const getGithubContext = (): GithubContextData => {
  if (githubContextData) {
    return githubContextData
  }

  const { repo: repoData, issue, sha, actor } = github.context

  if (!repoData) {
    throw new Error('Missing Github Context data')
  }

  const { owner, repo } = repoData

  const shortSha = (sha || '').slice(0, 7)
  const blobBaseUrl = `https://github.com/${owner}/${repo}/blob/${sha}`
  const commitUrl = `https://github.com/${owner}/${repo}/commit/${sha}`

  githubContextData = {
    owner,
    repo,
    actor,
    sha,
    shortSha,
    issueNumber: issue.number,
    blobBaseUrl,
    commitUrl
  }

  return githubContextData
}

export const getOctokit = (): Octokit => {
  if (configInputs.botAppId) {
    const { botAppId, botAppPrivateKey, botAppInstallationId } = configInputs
    return new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId: botAppId,
        privateKey: botAppPrivateKey,
        installationId: botAppInstallationId
      }
    })
  } else if (configInputs.token) {
    return github.getOctokit(configInputs.token) as unknown as Octokit
  } else {
    throw new Error(
      'Unable to get octokit instance. Missing token or bot app config'
    )
  }
}

export type GitBaseInfo = PullRequestEvent['pull_request']['base']

export const getBaseInfo = (): GitBaseInfo | undefined => {
  if (github.context.eventName === 'pull_request') {
    const event = github.context.payload as PullRequestEvent
    return event.pull_request.base
  }
}
