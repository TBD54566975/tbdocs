import * as core from '@actions/core'

import { configInputs, getInputEntryPoints } from './config'
import { runDocsReport } from './docs-report'
import { generateDocs } from './docs-generator'

import { getFilesDiffs } from './utils'
import { handleGithubDocsReport, handleGithubGeneratedDocs } from './github'

/**
 * The main function for the action.
 * @returns `Promise<void>` resolves when the action is complete.
 * @public
 */
export async function run(): Promise<void> {
  try {
    const {
      reportChangedScopeOnly,
      docsTargetOwnerRepo,
      failOnError,
      failOnWarnings
    } = configInputs

    const entryPoints = getInputEntryPoints()
    console.info('eps >>>', entryPoints)

    const changedFiles = reportChangedScopeOnly
      ? await getFilesDiffs()
      : undefined

    for (const entryPoint of entryPoints) {
      console.info(`Processing entry point ${entryPoint.file}...`)

      if (entryPoint.docsReporter) {
        console.info(`Executing docs reporter ${entryPoint.docsReporter} ...`)
        entryPoint.report = await runDocsReport(entryPoint, changedFiles)
      }

      if (entryPoint.docsGenerator) {
        console.info(`Executing docs generator ${entryPoint.docsGenerator} ...`)
        entryPoint.generatedDocsPath = await generateDocs(entryPoint)
      }
    }

    await handleGithubDocsReport(entryPoints, failOnError, failOnWarnings)

    if (docsTargetOwnerRepo) {
      await handleGithubGeneratedDocs(entryPoints)
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    console.error(error)
    if (error instanceof Error) core.setFailed(error.message)
  }
}
