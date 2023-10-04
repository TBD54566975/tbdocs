import * as core from '@actions/core'

import { configInputs } from './config'
import { runDocsReport } from './docs-report'
import { generateDocs } from './docs-generator'

/**
 * The main function for the action.
 * @returns `Promise<void>` resolves when the action is complete.
 * @public
 */
export async function run(): Promise<void> {
  try {
    if (configInputs.docsReporter) {
      core.debug(`Executing docs reporter ${configInputs.docsReporter} ...`)
      await runDocsReport()
    }

    if (configInputs.docsGenerator) {
      core.debug(`Executing docs generator ${configInputs.docsGenerator} ...`)
      await generateDocs()
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    console.error(error)
    if (error instanceof Error) core.setFailed(error.message)
  }
}

export const greetings = (): string => 'Hello world!'
