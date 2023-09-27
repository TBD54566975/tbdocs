import * as github from '@actions/github'

import { DocsReport, ReportMessage } from '.'
import { configInputs } from '../config'
import { GithubContextData, getGithubContext } from '../utils'

const REPORT_HEADER_PREFIX = `**Relevant Docs Changes Detected**`
const MISC_MESSAGES_GROUP = '_misc_group'
let githubContext: GithubContextData

export const commentReportSummary = async (
  report: DocsReport
): Promise<void> => {
  githubContext = getGithubContext()
  const commentBody = generateCommentBody(report)
  console.info(`>>> Report comment`, commentBody)
  pushComment(commentBody)
}

const generateCommentBody = (report: DocsReport): string => {
  const headerText =
    `${REPORT_HEADER_PREFIX}\n\n` +
    `🛑 Errors: ${report.errorsCount}\n` +
    `⚠️ Warnings: ${report.warningsCount}`

  const filesTable = generateFilesTable(report)

  const updateFooterText = `Last report updated @ ${new Date().toISOString()} - Commit: [\`${
    githubContext.shortSha
  }\`](${githubContext.commitUrl})`

  return `${headerText}\n\n${filesTable}\n\n---\n${updateFooterText}`
}

const generateFilesTable = (report: DocsReport): string => {
  const filesMessagesPairs = report.messages.map(message => {
    const relativeFilePath = message.sourceFilePath
      ? message.sourceFilePath.replace('/github/workspace/', '')
      : undefined
    return {
      file: relativeFilePath,
      message: getMessageLog(message, relativeFilePath)
    }
  })

  // group messages by file in a map of: file => messages[]
  const messagesByFile = new Map<string, string[]>()
  for (const { file, message } of filesMessagesPairs) {
    const fileKey = file || MISC_MESSAGES_GROUP
    const fileMessages = messagesByFile.get(fileKey) || []
    messagesByFile.set(fileKey, [...fileMessages, message])
  }

  let markdownTable = ''

  for (const file of messagesByFile.keys()) {
    const messages = messagesByFile.get(file) || []

    const fileTitle =
      file === MISC_MESSAGES_GROUP
        ? `🔀 Misc.`
        : `📄 **File**: [${file}](${file})`

    const fileHeaderRow = `| ${fileTitle} |\n| --- |`
    const messagesRows = `${messages.join('\n')}`
    markdownTable += `${fileHeaderRow}\n${messagesRows}\n\n`
  }

  return markdownTable
}

const getMessageLog = (
  message: ReportMessage,
  relativePath?: string
): string => {
  const flag =
    message.level === 'error' ? '🛑' : message.level === 'warning' ? '⚠️' : '➡️'

  const link =
    relativePath && message.sourceFileLine
      ? `[#L${message.sourceFileLine}](${githubContext.blobBaseUrl}/${relativePath}}#L${message.sourceFileLine})`
      : ''

  return `| ${flag} ${message.category}:${message.messageId}: ${message.text} ${link} |`
}

const pushComment = async (commentBody: string): Promise<void> => {
  if (!configInputs.token) {
    console.info('>>> Skipping pushing comment. Missing token...')
    return
  }

  const octokit = github.getOctokit(configInputs.token)
  const { data: auth } = await octokit.rest.users.getAuthenticated()

  const { owner, repo, issueNumber } = githubContext
  console.info('>>> Pushing comment to', {
    owner,
    repo,
    issueNumber,
    authLogin: auth.login
  })

  if (owner && repo && issueNumber) {
    // create a comment on the issue
    const comment = await createOrUpdateComment(
      octokit,
      auth.login,
      owner,
      repo,
      issueNumber,
      commentBody
    )
    console.info(`Comment: ${comment.data.url}`)
  } else {
    console.info('>>> Skipping comment. Missing owner, repo or issueNumber')
  }
}

const createOrUpdateComment = async (
  octokit: ReturnType<typeof github.getOctokit>,
  authLogin: string,
  owner: string,
  repo: string,
  issueNumber: number,
  commentBody: string
): Promise<{ data: { url: string } }> => {
  // check if the comment exist
  const comments = await octokit.rest.issues.listComments({
    owner,
    repo,
    issue_number: issueNumber
  })

  const existingComment = comments.data.find(
    comment =>
      comment.body?.includes(REPORT_HEADER_PREFIX) &&
      comment.user?.login === authLogin
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
