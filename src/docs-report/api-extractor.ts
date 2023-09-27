import {
  Extractor,
  ExtractorConfig,
  ExtractorMessage,
  ExtractorMessageCategory,
  ExtractorResult
} from '@microsoft/api-extractor'
import path from 'path'

import { DocsReport, DocsReporterType, MessageCategory, ReportMessage } from '.'
import { checkTsconfigProps, getJsonFile, lookupFile } from '../utils'
import { configInputs } from '../config'

export const generateApiExtractorReport = async (): Promise<DocsReport> => {
  const extractorConfig = initializeExtractorConfig()

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

const initializeExtractorConfig = (): ExtractorConfig => {
  const apiExtractorCustomJson = configInputs.apiExtractor.jsonPath

  if (apiExtractorCustomJson) {
    console.info(
      '>>> Loading api-extractor.json custom file:',
      apiExtractorCustomJson
    )
    return ExtractorConfig.loadFileAndPrepare(apiExtractorCustomJson)
  } else {
    console.info('>>> Automatically resolving api-extractor configs...')

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

interface PackageJsonRequiredFields {
  typings?: string
  types?: string
  main?: string
}

const getPackageRequiredFields = (
  packageJsonFullPath: string
): {
  typings: string
  main: string
} => {
  const packageJson =
    getJsonFile<PackageJsonRequiredFields>(packageJsonFullPath)

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
