import {
  Extractor,
  ExtractorConfig,
  ExtractorMessage,
  ExtractorMessageCategory,
  ExtractorResult
} from '@microsoft/api-extractor'
import { readFileSync, existsSync } from 'fs'
import path from 'path'

// @beta
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
  apiConfig?: string
): Promise<DocsReport> => {
  switch (docsReport) {
    case 'api-extractor':
      return generateApiExtractorReport(apiConfig)
    default:
      throw new Error(`Unknown docs report: ${docsReport}`)
  }
}

const generateApiExtractorReport = async (
  apiConfig?: string
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

  return report
}

const initializeExtractorConfig = (apiConfig?: string): ExtractorConfig => {
  if (apiConfig) {
    console.info('>>> Loading api-extractor.json custom file:', apiConfig)
    return ExtractorConfig.loadFileAndPrepare(apiConfig)
  } else {
    const config = ExtractorConfig.loadFile('api-extractor.json')
    const packageJsonFullPath = lookupFile('package.json')
    const projectFolder = path.dirname(packageJsonFullPath)

    checkTsconfigProps(projectFolder)

    const { typings } = getPackageRequiredFields(packageJsonFullPath)
    config.projectFolder = projectFolder
    config.mainEntryPointFilePath = typings

    console.info('>>> Api extractor config:', {
      typings,
      projectFolder,
      packageJsonFullPath
    })

    return ExtractorConfig.prepare({
      configObject: config,
      configObjectFullPath: undefined,
      packageJsonFullPath
    })
  }
}

const getPackageRequiredFields = (
  packageJsonFullPath: string
): {
  typings: string
  main: string
} => {
  const packageJsonFile = readFileSync(
    path.join(packageJsonFullPath, 'package.json')
  )
  const packageJson = JSON.parse(packageJsonFile.toString())

  // validate typings & main
  let typings = packageJson.typings || packageJson.types

  if (!typings) {
    typings = '<projectFolder>/dist/index.d.ts'
    console.warn(
      `No typings/types property declared in package.json... falling back to ${typings}`
    )
  }

  let main = packageJson.main
  if (!main) {
    main = '<projectFolder>/dist/index.js'
    console.warn(
      `No main property found in package.json... falling back to ${main}`
    )
  }

  return { typings, main }
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

function checkTsconfigProps(projectPath: string): void {
  const tsConfigFilePath = lookupFile('tsconfig.json', projectPath)
  const tsConfig = JSON.parse(readFileSync(tsConfigFilePath).toString())
  if (
    !tsConfig.compilerOptions ||
    !tsConfig.compilerOptions.declaration ||
    !tsConfig.compilerOptions.declarationMap
  ) {
    throw new Error(
      'tsconfig.json must have declaration and declarationMap set to true'
    )
  }
}

const lookupFile = (fileName: string, dir?: string): string => {
  const currentDirectory = dir || process.cwd()

  const packageJsonPath = path.join(currentDirectory, fileName)
  if (existsSync(packageJsonPath)) {
    return packageJsonPath
  } else {
    // lookup in the parent folder
    const parentDirectory = path.join(currentDirectory, '..')

    // check for not being in the root folder twice
    if (parentDirectory !== currentDirectory) {
      return lookupFile(parentDirectory)
    } else {
      throw new Error(`Could not find ${fileName}`)
    }
  }
}
