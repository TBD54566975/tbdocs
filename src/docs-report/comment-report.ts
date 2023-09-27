import * as github from '@actions/github'

import { DocsReport, ReportMessage } from '.'
import { configInputs } from '../config'

export const commentReportSummary = async (
  report: DocsReport
): Promise<void> => {
  const commentBody = generateCommentBody(report)
  console.info(`>>> Report comment`, commentBody)
  pushComment(commentBody)
}

const MISC_ERRORS_TITLE = 'Misc'

const generateCommentBody = (report: DocsReport): string => {
  let summaryMarkdownText =
    `**Docs Report Summary**\n\n` +
    `🛑 Errors: ${report.errorsCount}\n` +
    `⚠️ Warnings: ${report.warningsCount}\n\n`

  const commentLines = report.messages.map(message => {
    const sanitizedFilename = message.sourceFilePath
      ? message.sourceFilePath.replace('/github/workspace/', '')
      : MISC_ERRORS_TITLE

    return {
      file: sanitizedFilename,
      line: formatReportMessageRow(message, sanitizedFilename)
    }
  })

  const summaryLines = {} as Record<string, string[]>
  for (const line of commentLines) {
    if (!summaryLines[line.file]) {
      summaryLines[line.file] = []
    }
    summaryLines[line.file].push(line.line)
  }

  summaryMarkdownText += '```\n'
  for (const file in summaryLines) {
    const lines = summaryLines[file]
    const fileTitle =
      file === MISC_ERRORS_TITLE
        ? `🔀 ${MISC_ERRORS_TITLE}`
        : `📄 **File**: [${file}](${file})`
    const fileMarkdownSummary = `${fileTitle}\n${lines.join('\n')}`
    summaryMarkdownText += `${fileMarkdownSummary}\n\n`
  }
  summaryMarkdownText += '\n```'

  return summaryMarkdownText
}

const formatReportMessageRow = (
  message: ReportMessage,
  sanitizedFilename: string
): string => {
  const flag =
    message.level === 'error' ? '🛑' : message.level === 'warning' ? '⚠️' : '➡️'

  const link = message.sourceFileLine
    ? `[L${message.sourceFileLine}](${sanitizedFilename}#L${message.sourceFileLine})`
    : message.sourceFilePath && sanitizedFilename !== MISC_ERRORS_TITLE
    ? `[file](${sanitizedFilename})`
    : ''

  return `${flag} ${message.category}:${message.messageId}: ${message.text} ${link}`
}

const pushComment = async (commentBody: string): Promise<void> => {
  if (!configInputs.token) {
    console.info('>>> Skipping pushing comment. Missing token...')
    return
  }

  const octokit = github.getOctokit(configInputs.token)

  const { owner, repo } = github.context.repo
  const issueNumber = github.context.issue.number
  console.info('>>> Pushing comment to', { owner, repo, issueNumber })

  if (owner && repo && issueNumber) {
    // create a comment on the issue
    const comment = await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: issueNumber,
      body: commentBody
    })
    console.info(`Comment created: ${comment.data.url}`)
  } else {
    console.info('>>> Skipping comment. Missing owner, repo or issueNumber')
  }
}
