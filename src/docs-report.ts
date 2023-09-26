import {
  Extractor,
  ExtractorConfig,
  ExtractorMessage,
  ExtractorMessageCategory,
  ExtractorResult
} from '@microsoft/api-extractor'

export type DocsReporterType = 'api-extractor'

export interface DocsReport {
  reporter: DocsReporterType
  errorsCount: number
  warningsCount: number
  messages: ReportMessage[]
}

export type MessageCategory = 'compiler' | 'docs' | 'extractor' | 'unknown'

export type MessageLevel = 'error' | 'warning' | 'info' | 'verbose' | 'none'

export interface ReportMessage {
  level: MessageLevel
  category: MessageCategory
  messageId: string
  text: string
  sourceFilePath?: string
  sourceFileLine?: number
  sourceFileColumn?: number
  context?: string
}

export const generateReport = async (
  docsReport: DocsReporterType,
  apiConfig: string
): Promise<DocsReport> => {
  switch (docsReport) {
    case 'api-extractor':
      return generateApiExtractorReport(apiConfig)
    default:
      throw new Error(`Unknown docs report: ${docsReport}`)
  }
}

const generateApiExtractorReport = async (
  apiConfig: string
): Promise<DocsReport> => {
  const extractorConfig = initializeExtractorConfig(apiConfig)

  const report = {
    reporter: 'api-extractor' as DocsReporterType,
    errorsCount: 0,
    warningsCount: 0,
    messages: [] as ReportMessage[]
  }

  // Invoke API Extractor
  const extractorResult: ExtractorResult = Extractor.invoke(extractorConfig, {
    localBuild: false,
    // showVerboseMessages: true,
    // showDiagnostics: true,
    messageCallback: message => processApiExtractorMessage(report, message)
  })

  if (extractorResult.errorCount !== report.errorsCount) {
    console.warn(
      `API Extractor completed with ${extractorResult.errorCount} errors but report only caught ${report.errorsCount}`
    )
  }

  if (extractorResult.warningCount !== report.warningsCount) {
    console.warn(
      `API Extractor completed with ${extractorResult.warningCount} warnings but report only caught ${report.warningsCount}`
    )
  }

  // TODO: generate api.json artifact in the build?

  return report
}

const initializeExtractorConfig = (apiConfig: string): ExtractorConfig => {
  // check for the package json for these attributes
  // "typings": "./dist/index.d.ts",
  // "main": "./dist/index.js",

  // check for tsconfig
  // "declaration": true,
  // "sourceMap": true,
  // "declarationMap": true,

  // TODO: make this configurable
  const apiExtractorJsonPath: string = apiConfig

  // Load and parse the api-extractor.json file
  const extractorConfig: ExtractorConfig =
    ExtractorConfig.loadFileAndPrepare(apiExtractorJsonPath)

  //   console.info({ extractorConfig })
  return extractorConfig
}
const processApiExtractorMessage = (
  report: DocsReport,
  message: ExtractorMessage
): void => {
  if (message.category === ExtractorMessageCategory.Console) {
    return
  }

  const reportMessage: ReportMessage = {
    level: message.logLevel,
    category: getCategoryFromApiExtractor(message.category),
    messageId: message.messageId,
    text: message.text,
    sourceFilePath: message.sourceFilePath,
    sourceFileLine: message.sourceFileLine,
    sourceFileColumn: message.sourceFileColumn,
    context: message.properties.exportName
  }

  report.messages.push(reportMessage)

  if (reportMessage.category !== 'unknown') {
    message.handled = true
  } else {
    console.warn(`Unknown API Extractor message: ${message.text}`)
  }

  switch (message.logLevel) {
    case 'error':
      report.errorsCount++
      break
    case 'warning':
      report.warningsCount++
      break
  }
}

const getCategoryFromApiExtractor = (
  category: ExtractorMessageCategory
): MessageCategory => {
  switch (category) {
    case ExtractorMessageCategory.Compiler:
      return 'compiler'
    case ExtractorMessageCategory.TSDoc:
      return 'docs'
    case ExtractorMessageCategory.Extractor:
      return 'extractor'
    default:
      return 'unknown'
  }
}

/**
 * Wait for a number of milliseconds.
 *
 * TODO: remove this function
 *
 * @param milliseconds The number of milliseconds to wait.
 * @returns {Promise<string>} Resolves with 'done!' after the wait is over.
 */
export async function wait(milliseconds: number): Promise<string> {
  return new Promise(resolve => {
    if (isNaN(milliseconds)) {
      throw new Error('milliseconds not a number')
    }

    setTimeout(() => resolve('done!'), milliseconds)
  })
}
