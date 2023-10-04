import { setOutput, warning } from '@actions/core'

import { commentReportSummary } from './comment-report'
import { DocsReport } from '.'
import { annotateCode } from './annotate-code'
import { generateApiExtractorReport } from './api-extractor'
import { configInputs } from '../config'
import { getBaseSha, getFilesDiffs, isSourceInChangedScope } from '../utils'

export * from './interfaces'

/**
 * Runs the docs reporter to extract any docs errors/mistakes and processes
 * the results by annotating the code files and creating a PR comment.
 *
 * @beta
 **/
export const runDocsReport = async (): Promise<void> => {
  const rawReport = await generateReport()
  const report = await filterReport(rawReport)
  await processReport(report)
  setReportResults(report)
}

const generateReport = async (): Promise<DocsReport> => {
  switch (configInputs.docsReporter) {
    case 'api-extractor':
      return generateApiExtractorReport()
    default:
      throw new Error(`Unknown docs report: ${configInputs.docsReporter}`)
  }
}

const filterReport = async (rawReport: DocsReport): Promise<DocsReport> => {
  if (configInputs.reportChangedScopeOnly) {
    let targetBase = getBaseSha()
    if (!targetBase) {
      console.warn("Fail to determine the base sha, fallback to 'main'")
      targetBase = 'main'
    }
    const filesDiffs = await getFilesDiffs(targetBase)
    const filteredMessages = rawReport.messages.filter(
      message =>
        !message.sourceFilePath ||
        isSourceInChangedScope(
          filesDiffs,
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
  } else {
    return rawReport
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
