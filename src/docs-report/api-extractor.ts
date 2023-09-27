import {
  Extractor,
  ExtractorConfig,
  ExtractorMessage,
  ExtractorMessageCategory,
  ExtractorResult
} from '@microsoft/api-extractor'
import path from 'path'

import { DocsReport, DocsReporterType, MessageCategory, ReportMessage } from '.'
import { escapeTextForGithub, getJsonFile, lookupFile } from '../utils'
import { configInputs } from '../config'

// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports, import/no-commonjs
const tsconfig = require('tsconfck')

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
    text: escapeTextForGithub(message.text),
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
    const defaultApiExtractorJson = path.join(
      __dirname,
      '..',
      '..',
      'api-extractor.json'
    )
    console.info(
      '>>> Automatically resolving api-extractor configs...',
      defaultApiExtractorJson
    )

    const config = ExtractorConfig.loadFile(defaultApiExtractorJson)

    const initialProjectPath = configInputs.projectPath.startsWith('/')
      ? configInputs.projectPath
      : path.join(process.cwd(), configInputs.projectPath)
    const packageJsonFullPath = lookupFile('package.json', initialProjectPath)

    const projectPath = path.dirname(packageJsonFullPath)

    checkTsconfigProps(projectPath)

    const { typings } = getPackageRequiredFields(packageJsonFullPath)
    config.projectFolder = projectPath
    config.mainEntryPointFilePath = typings

    console.info('>>> Api extractor config:', {
      typings,
      projectPath,
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

export const checkTsconfigProps = async (
  projectPath: string
): Promise<void> => {
  const tsConfigFile = await tsconfig.parse(projectPath)
  if (!tsConfigFile) {
    throw new Error('Could not resolve tsconfig.json')
  }

  const tsConfig = tsConfigFile.tsconfig.config
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
