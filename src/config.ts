import { getInput } from '@actions/core'
import { DocsReporterType, DocsGeneratorType } from './docs-report'

export const configInputs = {
  projectPath: getInput('project_path') || '.',
  docsReport: (getInput('docs_report') || '') as DocsReporterType,
  docsGenerator: (getInput('docs_generator') || '') as DocsGeneratorType,
  docsTargetOwnerRepo: getInput('docs_target_owner_repo'),
  docsTargetBranch: getInput('docs_target_branch'),
  docsTargetPrBaseBranch: getInput('docs_target_pr_base_branch'),
  docsTargetRepoPath: getInput('docs_target_repo_path'),
  failOnError: getInput('fail_on_error') === 'true',
  token: getInput('token'),
  apiExtractor: {
    jsonPath: getInput('api_extractor_json_path')
  }
}
