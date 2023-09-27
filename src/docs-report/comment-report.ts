import * as github from '@actions/github'

import { DocsReport, ReportMessage } from '.'
import { configInputs } from '../config'
import { GithubContextData, getGithubContext } from '../utils'

const REPORT_HEADER_PREFIX = `**TBDocs Report**`
const MISC_MESSAGES_GROUP = '_misc_group'
const BOT_NAME = 'github-actions[bot]' // TODO: do we want a TBDocs branded bot?
let githubContext: GithubContextData

export const commentReportSummary = async (
  report: DocsReport
): Promise<void> => {
  githubContext = getGithubContext()
  const reportHasIssues = report.errorsCount > 0 || report.warningsCount > 0
  const commentBody = generateCommentBody(report, reportHasIssues)
  console.info(`>>> Report comment`, commentBody)
  pushComment(commentBody, reportHasIssues)
}

const generateCommentBody = (
  report: DocsReport,
  reportHasIssues: boolean
): string => {
  const headerText = `${REPORT_HEADER_PREFIX}`

  const subHeaderText = reportHasIssues
    ? `🛑 Errors: ${report.errorsCount}\n` +
      `⚠️ Warnings: ${report.warningsCount}`
    : `✅ No errors or warnings`

  const filesTable = generateFilesTable(report)

  const updateFooterText = `_Updated @ ${new Date().toISOString()} - Commit: [\`${
    githubContext.shortSha
  }\`](${githubContext.commitUrl})_`

  return `${headerText}\n\n${subHeaderText}\n\n${filesTable}\n\n---\n${updateFooterText}`
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
        : `📄 **File**: [${file}](${githubContext.blobBaseUrl}/${file})`

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
      ? `[#L${message.sourceFileLine}](${githubContext.blobBaseUrl}/${relativePath}#L${message.sourceFileLine})`
      : ''

  const text = escapeText(message.text)
  return `| ${flag} \`${message.category}:${message.messageId}\`: ${text} ${link} |`
}

const escapeText = (input: string): string => {
  let output = input

  // Escape GitHub Usernames tags
  output = input.replace(/@([a-zA-Z0-9-]+)/g, '`@$1`')

  return output
}

const pushComment = async (
  commentBody: string,
  reportHasIssues: boolean
): Promise<void> => {
  if (!configInputs.token) {
    console.info('>>> Skipping pushing comment. Missing token...')
    return
  }

  const octokit = github.getOctokit(configInputs.token)

  const { owner, repo, issueNumber, actor } = githubContext
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
      githubContext,
      reportHasIssues,
      commentBody
    )

    if (comment) {
      console.info(`Comment: ${comment?.data.url}`)
    }
  } else {
    console.info('>>> Skipping comment. Missing owner, repo or issueNumber')
  }
}

const createOrUpdateComment = async (
  octokit: ReturnType<typeof github.getOctokit>,
  { owner, repo, issueNumber }: GithubContextData,
  reportHasIssues: boolean,
  commentBody: string
): Promise<{ data: { url: string } } | undefined> => {
  // check if the comment exist
  const comments = await octokit.rest.issues.listComments({
    owner,
    repo,
    issue_number: issueNumber
  })

  const existingComment = comments.data.find(
    comment =>
      comment.body?.includes(REPORT_HEADER_PREFIX) &&
      comment.user?.login === BOT_NAME
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
    // only create a brand new comment if there are issues
  } else if (reportHasIssues) {
    console.info(`>>> Creating a brand new comment for the report`)
    return octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: issueNumber,
      body: commentBody
    })
  } else {
    console.info(`>>> Skipping comment. No issues found.`)
  }
}
