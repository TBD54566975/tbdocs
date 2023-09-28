import { getInput } from '@actions/core'
import { DocsReporterType, DocsGeneratorType } from './docs-report'

export const configInputs = {
  docsReport: (getInput('docs_report') || '') as DocsReporterType,
  docsGenerator: (getInput('docs_generator') || '') as DocsGeneratorType,
  failOnError: getInput('fail_on_error') === 'true',
  projectPath: getInput('project_path') || '.',
  token: getInput('token'),
  apiExtractor: {
    jsonPath: getInput('api_extractor_json_path')
  }
}
