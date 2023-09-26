import * as core from '@actions/core'
import {
  DocsReporterType,
  DocsReport,
  generateReport,
  ReportMessage
} from './docs-report'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const docsReport: string = core.getInput('docs_report') || 'api-extractor'
    const failOnError: boolean = core.getInput('fail_on_error') === 'true'
    const apiConfig: string =
      core.getInput('api_config') || './api-extractor.json'

    // Debug logs are only output if the `ACTIONS_STEP_DEBUG` secret is true
    core.debug(`Executing docs report ${docsReport} ...`)
    const report = await generateReport(
      docsReport as DocsReporterType,
      apiConfig
    )

    await processReport(report, failOnError)

    // Set outputs for other workflow steps to use
    core.setOutput('report', JSON.stringify(report))
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}

const processReport = async (
  report: DocsReport,
  failOnError: boolean
): Promise<void> => {
  console.info(`Report: ${JSON.stringify(report)}`)

  annotateCode(report.messages)

  // TODO: create a summary of the report in a Github comment

  if (report.errorsCount > 0) {
    const errorMessage = `Docs report ${report.reporter} failed with ${report.errorsCount} errors.`
    core.error(errorMessage)
    if (failOnError) {
      core.setFailed(errorMessage)
    }
  } else if (report.warningsCount > 0) {
    const warningMessage = `Docs report ${report.reporter} completed with ${report.warningsCount} warnings.`
    core.warning(warningMessage)
  }
}

type AnnotationFunction = (
  message: string | Error,
  properties?: core.AnnotationProperties
) => void

const annotateCode = (messages: ReportMessage[]): void => {
  for (const message of messages) {
    const annotateFn = getAnnotationFn(message.level)

    annotateFn(message.text, {
      title: `${message.category}: ${message.messageId}`,
      file: message.sourceFilePath,
      startLine: message.sourceFileLine,
      startColumn: message.sourceFileColumn
    })
  }
}

const getAnnotationFn = (level: string): AnnotationFunction => {
  switch (level) {
    case 'error':
      return core.error
    case 'warning':
      return core.warning
    default:
      return core.notice
  }
}
