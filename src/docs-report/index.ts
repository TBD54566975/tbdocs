import { FilesDiffsMap, isSourceInChangedScope } from '../utils'
import { EntryPoint } from '../interfaces'
import { generateApiExtractorReport } from './api-extractor'
import { DocsReport } from './interfaces'

export * from './report-markdown'
export * from './interfaces'

/**
 * Runs the docs reporter to extract any docs errors/mistakes and processes
 * the results by annotating the code files and creating a PR comment.
 *
 * @beta
 **/
export const runDocsReport = async (
  entryPoint: EntryPoint,
  changedFiles?: FilesDiffsMap,
  ignoreMessages?: string[]
): Promise<DocsReport> => {
  const report = await generateReport(entryPoint, ignoreMessages)
  return changedFiles ? filterReport(report, changedFiles) : report
}

const generateReport = async (
  entryPoint: EntryPoint,
  ignoreMessages?: string[]
): Promise<DocsReport> => {
  switch (entryPoint.docsReporter) {
    case 'api-extractor':
      return generateApiExtractorReport(entryPoint, ignoreMessages)
    default:
      throw new Error(`Unknown docs report: ${entryPoint.docsReporter}`)
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
