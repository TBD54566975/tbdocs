import { DocsGeneratorType } from './docs-generator'
import { DocsReport, DocsReporterType } from './docs-report'

export interface EntryPoint {
  file: string
  docsReporter?: DocsReporterType
  report?: DocsReport
  docsGenerator?: DocsGeneratorType
  generatedDocsPath?: string
}
