/**
 * The name of the tool used to analyze the code docs
 * and generate a report.
 *
 * **Supported reporters:**
 * - Typescript: `api-extractor`
 *
 * **Future to-do work:**
 * - Kotlin: detekt
 * - etc...
 *
 *  @public
 **/
export type DocsReporterType = 'api-extractor'

/**
 * Object containing the result of running the docs reporter.
 *
 * @beta
 **/
export interface DocsReport {
  /**
   * The tool used to generate the report. See {@link DocsReporterType}
   */
  reporter: DocsReporterType

  /**
   * The number of errors found in the docs report.
   */
  errorsCount: number

  /**
   * The number of warnings found in the docs report.
   */
  warningsCount: number

  /**
   * The list of messages found in the docs report. See {@link ReportMessage}
   */
  messages: ReportMessage[]
}

/**
 * The category of the report message.
 *
 * @beta
 **/
export type MessageCategory = 'compiler' | 'docs' | 'extractor' | 'unknown'

/**
 * The level of the report message.
 *
 * @beta
 **/
export type MessageLevel = 'error' | 'warning' | 'info' | 'verbose' | 'none'

/**
 * The report message.
 *
 * @beta
 **/
export interface ReportMessage {
  /**
   * The level of the message. You should never ignore errors if
   * you want to keep your docs in good shape.
   */
  level: MessageLevel

  /**
   * The category of the message.
   */
  category: MessageCategory

  /**
   * The ID of the issue
   */
  messageId: string

  /**
   * The prettified text of the message.
   */
  text: string

  /**
   * The source file path where the issue was found.
   */
  sourceFilePath?: string

  /**
   * The line number in the source file where the issue was found.
   */
  sourceFileLine?: number

  /**
   * The column number in the source file where the issue was found.
   */
  sourceFileColumn?: number

  /**
   * The context of the issue, such as the name of the exported symbol.
   */
  context?: string
}
