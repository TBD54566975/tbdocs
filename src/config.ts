import { getInput } from '@actions/core'
import { DocsReporterType, DocsGeneratorType } from './docs-report'

export const configInputs = {
  projectPath: getInput('project_path') || '.',
  token: getInput('token'),

  docsReporter: (getInput('docs_reporter') || '') as DocsReporterType,
  failOnError: getInput('fail_on_error') === 'true',
  failOnWarnings: getInput('fail_on_warnings') === 'true',
  apiExtractor: {
    jsonPath: getInput('api_extractor_json_path')
  },

  docsGenerator: (getInput('docs_generator') || '') as DocsGeneratorType,
  docsTargetOwnerRepo: getInput('docs_target_owner_repo'),
  docsTargetBranch: getInput('docs_target_branch'),
  docsTargetPrBaseBranch: getInput('docs_target_pr_base_branch'),
  docsTargetRepoPath: getInput('docs_target_repo_path'),

  // app config allows for pushing on different repos
  botAppId: getInput('bot_app_id') || '',
  botAppPrivateKey: getInput('bot_app_private_key') || '',
  botAppInstallationId: getInput('bot_app_installation_id') || ''
}
