import { DocsGeneratorType } from './docs-generator'
import { DocsReport, DocsReporterType } from './docs-report'

/**
 * Data related to a project entry point. Each entry point will be processed by tbdocs.
 *
 * @beta
 */
export interface EntryPointInputs {
  /** Project main entry point file, eg: src/index.ts */
  file: string

  /**
   * Type of doc-reporter to run, eg: api-extractor.
   * If not present, checks for docs will be skipped.
   **/
  docsReporter?: DocsReporterType

  /**
   * Type of docs-generator to run, eg: typedoc-markdown;
   * If not present, no docs will be generated.
   **/
  docsGenerator?: DocsGeneratorType

  /**
   * Path to the target repo where the docs will be pushed to.
   * If not present, the docs will be generated locally.
   */
  targetRepoPath?: string
}

/**
 * Data that will be collected along the processing of a project entry point.
 *
 * @beta
 */
export interface EntryPoint extends EntryPointInputs {
  /**
   * Project path, eg: /packages/my-project - derived from the closest package.json
   * found relative to the entry point file {@link EntryPointInputs#file}
   **/
  projectPath?: string

  /** Project name, eg: \@my-org/my-project - collected from package.json */
  projectName?: string

  /** Result from the execution of {@link EntryPointInputs#docsReporter} */
  report?: DocsReport

  /** Path to the generated docs by {@link EntryPointInputs#docsGenerator} */
  generatedDocsPath?: string
}
