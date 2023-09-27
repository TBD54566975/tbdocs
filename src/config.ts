import { getInput } from '@actions/core'
import { DocsReporterType } from './docs-report'

export const configInputs = {
  docsReport: (getInput('docs_report') || 'api-extractor') as DocsReporterType,
  failOnError: getInput('fail_on_error') === 'true',
  projectPath: getInput('project_path') || '.',
  token: getInput('token'),
  apiExtractor: {
    jsonPath: getInput('api_extractor_json_path')
  }
}
