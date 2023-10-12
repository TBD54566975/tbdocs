import { Octokit } from '@octokit/rest'

import { configInputs } from '../config'
import { getGithubContext, getOctokit } from '../utils'

const BOT_NAME = 'github-actions[bot]' // TODO: handle botAppId

export const commentPr = async (
  commentBody: string,
  commentPrefix: string
): Promise<void> => {
  if (!configInputs.token && !configInputs.botAppId) {
    console.info(
      '>>> Skipping pushing comment. Missing credentials (token or botAppId)...'
    )
    return
  }

  const octokit = getOctokit()

  const { owner, repo, issueNumber, actor } = getGithubContext()
  console.info('>>> Pushing comment to', {
    owner,
    repo,
    issueNumber,
    actor
  })

  if (owner && repo && issueNumber) {
    // create a comment on the issue
    const comment = await createOrUpdateComment(
      octokit,
      owner,
      repo,
      issueNumber,
      commentBody,
      commentPrefix
    )

    if (comment) {
      console.info(`Comment: ${comment?.data.url}`)
    }
  } else {
    console.info('>>> Skipping comment. Missing owner, repo or issueNumber')
  }
}

const createOrUpdateComment = async (
  octokit: Octokit,
  owner: string,
  repo: string,
  issueNumber: number,
  commentBody: string,
  commentPrefix: string
): Promise<{ data: { url: string } } | undefined> => {
  // check if the comment exist
  const comments = await octokit.rest.issues.listComments({
    owner,
    repo,
    issue_number: issueNumber
  })

  const existingComment = comments.data.find(
    comment =>
      comment.body?.includes(commentPrefix) && comment.user?.login === BOT_NAME
  )

  if (existingComment) {
    console.info(
      `>>> Updating existing comment ${existingComment.id} for the report`
    )
    return octokit.rest.issues.updateComment({
      owner,
      repo,
      comment_id: existingComment.id,
      body: commentBody
    })
  } else {
    console.info(`>>> Creating a brand new comment for the report`)
    return octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: issueNumber,
      body: commentBody
    })
  }
}
