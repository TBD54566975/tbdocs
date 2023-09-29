/** @beta */
export type DocsReporterType = 'api-extractor'

/** @beta */
export type DocsGeneratorType = 'typedoc-markdown'

/** @beta */
export interface DocsReport {
  reporter: DocsReporterType
  errorsCount: number
  warningsCount: number
  messages: ReportMessage[]
}

/** @beta */
export type MessageCategory = 'compiler' | 'docs' | 'extractor' | 'unknown'

/** @beta */
export type MessageLevel = 'error' | 'warning' | 'info' | 'verbose' | 'none'

/** @beta */
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
