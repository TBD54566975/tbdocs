import { EntryPoint } from '../interfaces'
import { DocsReport, ReportMessage } from '../docs-report'
import { getGithubContext } from '../utils'

import { commentPr } from './comment-pr'
import { annotateCode } from './annotate-code'

const REPORT_HEADER_PREFIX = `**TBDocs Report**`
const MISC_MESSAGES_GROUP = '_misc_group'

export const submitReportsSummaryComment = async (
  entryPoints: EntryPoint[]
): Promise<void> => {
  const totalCounts = { errors: 0, warnings: 0 }

  const projectsComments = entryPoints
    .filter(ep => ep.report)
    .map(ep => processReport(ep.projectName, ep.report!, ep.file, totalCounts))

  const finalCommentBody = getTotalReportsSummaryCommentBody(
    projectsComments,
    totalCounts.errors,
    totalCounts.warnings
  )

  await commentPr(finalCommentBody, REPORT_HEADER_PREFIX)
}

/** Annotate report files and generate the comment summary */
const processReport = (
  projectName = '(unknown)',
  report: DocsReport,
  file: string,
  totalReportsAccumulator: { errors: number; warnings: number }
) => {
  console.info(`${projectName} Report: ${JSON.stringify(report, undefined, 2)}`)
  annotateCode(report.messages)
  totalReportsAccumulator.errors += report.errorsCount
  totalReportsAccumulator.warnings += report.warningsCount
  return getCommentReportSummary(report, projectName, file)
}

export const getCommentReportSummary = (
  report: DocsReport,
  projectName: string,
  entryPointFile: string
): string => {
  const projectHeader = `**Project**: ${projectName} - ${entryPointFile}`
  const filesTable = generateFilesTable(report)
  const commentBody = `${projectHeader}\n\n${filesTable}`
  console.info(`>>> Report comment for project ${projectName}\n`, commentBody)
  return commentBody
}

export const getTotalReportsSummaryCommentBody = (
  reportsComments: string[],
  errorsCount: number,
  warningsCount: number
): string => {
  const headerText = `${REPORT_HEADER_PREFIX}`

  const reportHasIssues = errorsCount > 0 || warningsCount > 0
  const subHeaderText = reportHasIssues
    ? `🛑 Errors: ${errorsCount}\n` + `⚠️ Warnings: ${warningsCount}`
    : `✅ No errors or warnings`

  const filesTables = reportsComments.join('\n\n')

  const { shortSha, commitUrl } = getGithubContext()
  const updateFooterText = `_Updated @ ${new Date().toISOString()} - Commit: [\`${shortSha}\`](${commitUrl})_`

  return `${headerText}\n\n${subHeaderText}\n\n${filesTables}\n\n---\n${updateFooterText}`
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

    const { blobBaseUrl } = getGithubContext()
    const fileTitle =
      file === MISC_MESSAGES_GROUP
        ? `🔀 Misc.`
        : `📄 **File**: [${file}](${blobBaseUrl}/${file})`

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

  const { blobBaseUrl } = getGithubContext()
  const link =
    relativePath && message.sourceFileLine
      ? `[#L${message.sourceFileLine}](${blobBaseUrl}/${relativePath}#L${message.sourceFileLine})`
      : ''

  return `| ${flag} \`${message.category}:${message.messageId}\`: ${message.text} ${link} |`
}
