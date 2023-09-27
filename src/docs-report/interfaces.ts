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
