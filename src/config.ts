import { getInput } from '@actions/core'

import { parseDocument } from 'yaml'
import { EntryPoint } from './interfaces'

export const getInputEntryPoints = (): EntryPoint[] => {
  const defaultEntryPoint = `
  - file: src/index.ts
    docsReporter: api-extractor
    docsGenerator: typedoc-markdown
  `

  const entryPointsRawYaml = getInput('entry_points') || defaultEntryPoint

  const yamlDoc = parseDocument(entryPointsRawYaml)

  if (yamlDoc.errors.length > 0) {
    throw new Error(`Invalid YAML entry_points input: ${yamlDoc.errors}`)
  }

  const entryPoints = yamlDoc.toJS() as EntryPoint[]
  return entryPoints
}

export const configInputs = {
  token: getInput('token'),

  // app config allows for pushing on different repos
  botAppId: getInput('bot_app_id') || '',
  botAppPrivateKey: getInput('bot_app_private_key') || '',
  botAppInstallationId: getInput('bot_app_installation_id') || '',

  reportChangedScopeOnly: getInput('report_changed_scope_only') === 'true',
  failOnError: getInput('fail_on_error') === 'true',
  failOnWarnings: getInput('fail_on_warnings') === 'true',

  groupDocs: getInput('group_docs') === 'true',

  docsTargetOwnerRepo: getInput('docs_target_owner_repo'),
  docsTargetBranch: getInput('docs_target_branch'),
  docsTargetPrBaseBranch: getInput('docs_target_pr_base_branch')
}
