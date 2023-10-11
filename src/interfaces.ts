import { DocsGeneratorType } from './docs-generator'
import { DocsReport, DocsReporterType } from './docs-report'

export interface EntryPointInputs {
  file: string
  docsReporter?: DocsReporterType
  docsGenerator?: DocsGeneratorType
  targetRepoPath?: string
}

export interface EntryPoint extends EntryPointInputs {
  projectPath?: string
  projectName?: string
  report?: DocsReport
  generatedDocsPath?: string
}
