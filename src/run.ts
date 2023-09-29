import * as core from '@actions/core'

import { configInputs } from './config'
import { runDocsReport } from './docs-report'
import { generateDocs } from './docs-generator'

/**
 * The main function for the action.
 * @returns `Promise<void>` Resolves when the action is complete.
 * @public
 */
export async function run(): Promise<void> {
  try {
    if (configInputs.docsReport) {
      core.debug(`Executing docs report ${configInputs.docsReport} ...`)
      await runDocsReport()
    }

    if (configInputs.docsGenerator) {
      core.debug(`Executing docs generator ${configInputs.docsGenerator} ...`)
      await generateDocs()
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
