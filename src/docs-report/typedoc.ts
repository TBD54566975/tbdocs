import path from 'path'
import ts from 'typescript'

import { DocsReport, MessageLevel } from './interfaces'
import { loadTsconfigProps, lookupFile } from '../utils'
import { EntryPoint } from '../interfaces'
import {
  Application,
  LogLevel,
  Logger,
  MinimalSourceFile,
  TypeDocOptions,
  ValidationOptions
} from 'typedoc'

export const generateTypedocReport = async (
  entryPoint: EntryPoint,
  ignoreMessages?: string[]
): Promise<DocsReport> => {
  console.info('ignoreMessages', ignoreMessages)
  const entryPointFile = entryPoint.file
  const typedocValidationConfig = initializeConfig(entryPointFile)

  const entryPointFileFullPath = path.dirname(
    path.join(process.cwd(), entryPointFile)
  )
  const packageJsonFullPath = lookupFile('package.json', entryPointFileFullPath)
  const projectPath = path.dirname(packageJsonFullPath)

  entryPoint.projectPath = projectPath

  const { tsconfigFile } = await loadTsconfigProps(entryPoint.projectPath)

  const generatorConfig: Partial<TypeDocOptions> = {
    tsconfig: tsconfigFile,
    entryPoints: [entryPointFile],
    validation: typedocValidationConfig
    // skipErrorChecking: true,
    // disableSources: true,
    // readme: entryPoint.readmeFile || 'none',
    // includeVersion: true
  }

  console.info('>>> Typedoc Report entryPoint', entryPointFile, generatorConfig)
  const generatorApp = await Application.bootstrapWithPlugins(generatorConfig)

  const projectReflection = await generatorApp.convert()
  if (!projectReflection) {
    throw new Error('Typedoc Report: Failed to generate project reflection')
  }

  const logger = new TypedocReportLogger()
  generatorApp.logger = logger

  generatorApp.validate(projectReflection)
  return logger.getReport()
}

const initializeConfig = (entryPointFile: string): ValidationOptions => {
  console.info('>>> Typedoc Report initializeConfig', entryPointFile)
  // TODO: allow dynamic config input from tbdocs action inputs
  return {
    notExported: true,
    invalidLink: true,
    notDocumented: true
  }
}

class TypedocReportLogger extends Logger {
  private report: DocsReport = {
    reporter: 'typedoc',
    errorsCount: 0,
    warningsCount: 0,
    messages: []
  }

  getReport(): DocsReport {
    return this.report
  }

  addContext(
    message: string,
    level: LogLevel,
    ...args: [ts.Node?] | [number, MinimalSourceFile]
  ): string {
    const messageLevel = {
      [LogLevel.Error]: 'error',
      [LogLevel.Warn]: 'warning',
      [LogLevel.Info]: 'info',
      [LogLevel.Verbose]: 'verbose',
      [LogLevel.None]: 'none'
    }[level] as MessageLevel

    let pos
    let file

    console.info('typedoc-context args >>>', { message, level, args })
    if (typeof args[0] == 'undefined') {
      pos = 0
      file = undefined
    } else if (typeof args[0] !== 'number') {
      pos = args[0].getStart(args[0].getSourceFile(), false)
      file = args[0].getSourceFile()
    } else {
      pos = args[0]
      file = args[1]
    }

    let sourceFilePath
    let sourceFileLine
    let sourceFileColumn
    let context
    let text = message
    if (file) {
      const { line, character } = file.getLineAndCharacterOfPosition(pos)
      sourceFilePath = file.fileName
      sourceFileLine = line
      sourceFileColumn = character

      const location = `${sourceFilePath}:${line + 1}:${character}`

      const start = file.text.lastIndexOf('\n', pos) + 1
      let end = file.text.indexOf('\n', start)
      if (end === -1) end = file.text.length

      const prefix = `${location} - [${level}]`

      context = `${line + 1}    ${file.text.substring(start, end)}`
      text = `${prefix} ${message}\n\n${context}\n`

      sourceFilePath
    } else {
      const [rawMessage, fileName] = parseMessageFileLocation(message)
      if (rawMessage && fileName) {
        sourceFilePath = fileName
        text = rawMessage
      }
    }

    this.reportMessage(
      messageLevel,
      text,
      sourceFilePath,
      sourceFileLine,
      sourceFileColumn,
      context
    )

    return text
  }

  private reportMessage(
    messageLevel: MessageLevel,
    text: string,
    sourceFilePath?: string,
    sourceFileLine?: number,
    sourceFileColumn?: number,
    context?: string
  ): void {
    // count errors and warnings
    switch (messageLevel) {
      case 'error':
        this.report.errorsCount += 1
        break
      case 'warning':
        this.report.warningsCount += 1
        break
      case 'info':
        break
      default:
        return
    }

    this.report.messages.push({
      level: messageLevel,
      category: 'extractor',
      messageId: getTypedocMessageId(text),
      text,
      sourceFilePath,
      sourceFileLine,
      sourceFileColumn,
      context
    })
  }
}

const getTypedocMessageId = (text: string): string => {
  // exports validations
  if (text.includes('missing export')) {
    return 'typedoc:missing-export'
  } else if (text.includes('intentionally not exported')) {
    return 'typedoc:unintentional-export'
  } else if (text.includes('not included in the documentation')) {
    return 'typedoc:missing-reference'

    // links validations
  } else if (text.includes('resolve link')) {
    return 'typedoc:invalid-link'

    // docs validation
  } else if (text.includes('not have any documentation')) {
    return 'typedoc:missing-docs'

    // unknown
  } else {
    return 'typedoc:generic'
  }
}

const parseMessageFileLocation = (text: string): [string?, string?] => {
  // Regular expression to capture the message and file path
  const regex = /^(.+?), defined in (.*), (.+?)$/
  const match = text.match(regex)

  if (match) {
    // Extracted parts from the log
    const message = `${match[1]} ${match[3]}`
    const file = match[2]

    // Creating the object with the extracted information
    return [message, file]
  }

  return [undefined, undefined]
}
