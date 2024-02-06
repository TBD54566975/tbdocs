import path from 'path'

import {
  DocsReport,
  DocsReporterType,
  MessageLevel,
  ReportMessage
} from './interfaces'
import { loadTsconfigProps, lookupFile } from '../utils'
import { EntryPoint } from '../interfaces'
import {
  Application,
  LogLevel,
  Logger,
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

  const reportLogger = new TypedocReportLogger()
  generatorApp.logger = reportLogger

  generatorApp.validate(projectReflection)
  const messages = reportLogger.getReport()
  console.info('>>> Typedoc Report validate logs', messages)

  const report = {
    reporter: 'typedoc' as DocsReporterType,
    errorsCount: 0,
    warningsCount: 0,
    messages
  }

  return report
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
  private report: ReportMessage[] = []

  getReport(): ReportMessage[] {
    return this.report
  }

  log(message: string, level: LogLevel): void {
    super.log(message, level)

    const messageLevel = {
      [LogLevel.Error]: 'error',
      [LogLevel.Warn]: 'warning',
      [LogLevel.Info]: 'info',
      [LogLevel.Verbose]: 'verbose',
      [LogLevel.None]: 'none'
    }[level] as MessageLevel

    if (messageLevel) {
      const log = `[${messageLevel}] ${message}`
      console.info(log)
      this.report.push({
        level: messageLevel,
        category: 'docs',
        messageId: 'typedoc-validation',
        text: message
      })
    }
  }

  // addContext(message, level, ...args) {
  //   if (typeof args[0] === 'undefined') {
  //     return `${messagePrefixes[level]} ${message}`
  //   }
  //   if (typeof args[0] !== 'number') {
  //     return this.addContext(
  //       message,
  //       level,
  //       args[0].getStart(args[0].getSourceFile(), false),
  //       args[0].getSourceFile()
  //     )
  //   }
  //   const [pos, file] = args
  //   const path = (0, paths_1.nicePath)(file.fileName)
  //   const { line, character } = file.getLineAndCharacterOfPosition(pos)
  //   const location = `${color(path, 'cyan')}:${color(
  //     `${line + 1}`,
  //     'yellow'
  //   )}:${color(`${character}`, 'yellow')}`
  //   const start = file.text.lastIndexOf('\n', pos) + 1
  //   let end = file.text.indexOf('\n', start)
  //   if (end === -1) end = file.text.length
  //   const prefix = `${location} - ${messagePrefixes[level]}`
  //   const context = `${color(`${line + 1}`, 'black')}    ${file.text.substring(
  //     start,
  //     end
  //   )}`
  //   return `${prefix} ${message}\n\n${context}\n`
  // }
}
