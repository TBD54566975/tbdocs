import * as core from '@actions/core'

import { configInputs } from './config'
import { runDocsReport } from './docs-report'

/**
 * The main function for the action.
 * @returns `Promise<void>` Resolves when the action is complete.
 * @beta
 */
export async function run(): Promise<void> {
  try {
    // Debug logs are only output if the `ACTIONS_STEP_DEBUG` secret is true
    core.debug(`Executing docs report ${configInputs.docsReport} ...`)
    runDocsReport()
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
