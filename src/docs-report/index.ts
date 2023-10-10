import { DocsReport } from '.'
import { generateApiExtractorReport } from './api-extractor'
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
