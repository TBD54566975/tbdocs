import github from '@actions/github'

import { DocsReport, ReportMessage } from '.'
import { configInputs } from '../config'

export const commentReportSummary = async (
  report: DocsReport
): Promise<void> => {
  const commentBody = generateCommentBody(report)
  console.info(`>>> Report comment`, commentBody)
  pushComment(commentBody)
}

const generateCommentBody = (report: DocsReport): string => {
  let summaryMarkdownText =
    `**Docs Report Summary**\n\n` +
    `🛑 Errors: ${report.errorsCount}\n` +
    `⚠️ Warnings: ${report.warningsCount}\n\n`

  const commentLines = report.messages.map(message => ({
    file: message.sourceFilePath || `_summary`,
    line: formatReportMessageRow(message)
  }))

  const summaryLines = {} as Record<string, string[]>
  for (const line of commentLines) {
    if (!summaryLines[line.file]) {
      summaryLines[line.file] = []
    }
    summaryLines[line.file].push(line.line)
  }

  for (const file in summaryLines) {
    const lines = summaryLines[file]
    const fileMarkdownSummary = `File: **${file}**\n\n- ${lines.join('\n- ')}`
    summaryMarkdownText += fileMarkdownSummary + '\n\n'
  }

  return summaryMarkdownText
}

const formatReportMessageRow = (message: ReportMessage): string => {
  const flag =
    message.level === 'error' ? '🛑' : message.level === 'warning' ? '⚠️' : '➡️'

  const link = message.sourceFileLine
    ? `[L${message.sourceFileLine}](${message.sourceFilePath}#L${message.sourceFileLine})`
    : message.sourceFilePath
    ? `[file](${message.sourceFilePath})`
    : ''

  return `${flag} ${message.category}:${message.messageId}: ${message.text} ${link}`
}

const pushComment = async (commentBody: string): Promise<void> => {
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
