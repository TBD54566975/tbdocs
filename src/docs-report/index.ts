import { setOutput, warning } from '@actions/core'

import { commentReportSummary } from './comment-report'
import { DocsReport } from '.'
import { annotateCode } from './annotate-code'
import { generateApiExtractorReport } from './api-extractor'
import { configInputs } from '../config'
import { FilesDiffsMap, isSourceInChangedScope } from '../utils'
import { DocsReporterType } from './interfaces'

export * from './interfaces'

/**
 * Runs the docs reporter to extract any docs errors/mistakes and processes
 * the results by annotating the code files and creating a PR comment.
 *
 * @beta
 **/
export const runDocsReport = async (
  docsReporter: DocsReporterType,
  entryPointFile: string,
  changedFiles?: FilesDiffsMap
): Promise<DocsReport> => {
  const report = await generateReport(docsReporter, entryPointFile)
  return changedFiles ? filterReport(report, changedFiles) : report
  // await processReport(report)
  // setReportResults(report)
}

const generateReport = async (
  docsReporter: DocsReporterType,
  entryPointFile: string
): Promise<DocsReport> => {
  switch (docsReporter) {
    case 'api-extractor':
      return generateApiExtractorReport(entryPointFile)
    default:
      throw new Error(`Unknown docs report: ${docsReporter}`)
  }
}

const filterReport = (
  rawReport: DocsReport,
  changedFiles: FilesDiffsMap
): DocsReport => {
  const filteredMessages = rawReport.messages.filter(
    message =>
      !message.sourceFilePath ||
      isSourceInChangedScope(
        changedFiles,
        message.sourceFilePath,
        message.sourceFileLine
      )
  )

  // recompute errors and warnings count
  let errorsCount = 0
  let warningsCount = 0
  for (const message of filteredMessages) {
    if (message.level === 'error') {
      errorsCount++
    } else if (message.level === 'warning') {
      warningsCount++
    }
  }

  return {
    ...rawReport,
    errorsCount,
    warningsCount,
    messages: filteredMessages
  }
}

const processReport = async (report: DocsReport): Promise<void> => {
  console.info(`Report: ${JSON.stringify(report, undefined, 2)}`)
  annotateCode(report.messages)
  await commentReportSummary(report)
}

const setReportResults = (report: DocsReport): void => {
  if (report.errorsCount > 0) {
    const errorMessage = `Docs report ${report.reporter} failed with ${report.errorsCount} errors.`
    console.error(errorMessage)
    if (configInputs.failOnError) {
      throw new Error(errorMessage)
    }
  }

  if (report.warningsCount > 0) {
    const warningMessage = `Docs report ${report.reporter} completed with ${report.warningsCount} warnings.`
    warning(warningMessage)
    if (configInputs.failOnWarnings) {
      throw new Error(warningMessage)
    }
  }

  // Set outputs for other workflow steps to use
  setOutput('report', JSON.stringify(report))
}
