import { setOutput, warning } from '@actions/core'

import { commentReportSummary } from './comment-report'
import { DocsReporterType, DocsReport } from '.'
import { annotateCode } from './annotate-code'
import { generateApiExtractorReport } from './api-extractor'
import { configInputs } from '../config'

export * from './interfaces'

/** @beta */
export const runDocsReport = async (): Promise<void> => {
  const report = await generateReport(configInputs.docsReport)
  await processReport(report)
  setReportResults(report)
}

const generateReport = async (
  docsReport: DocsReporterType
): Promise<DocsReport> => {
  switch (docsReport) {
    case 'api-extractor':
      return generateApiExtractorReport()
    default:
      throw new Error(`Unknown docs report: ${docsReport}`)
  }
}

const processReport = async (report: DocsReport): Promise<void> => {
  console.info(`Report: ${JSON.stringify(report)}`)
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
  } else if (report.warningsCount > 0) {
    const warningMessage = `Docs report ${report.reporter} completed with ${report.warningsCount} warnings.`
    warning(warningMessage)
  }

  // Set outputs for other workflow steps to use
  setOutput('report', JSON.stringify(report))
}
