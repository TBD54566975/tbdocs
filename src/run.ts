import * as core from '@actions/core'

import { configInputs } from './config'
import { runDocsReport } from './docs-report'
import { generateDocs } from './docs-generator'
import { EntryPoint } from './interfaces'
import { getFilesDiffs } from './utils'

/**
 * The main function for the action.
 * @returns `Promise<void>` resolves when the action is complete.
 * @public
 */
export async function run(): Promise<void> {
  try {
    const entryPoints: EntryPoint[] = []
    const changedFiles = configInputs.reportChangedScopeOnly
      ? await getFilesDiffs()
      : undefined

    for (const entryPoint of entryPoints) {
      core.info(`Processing entry point ${entryPoint.file}...`)

      if (entryPoint.docsReporter) {
        core.info(`Executing docs reporter ${entryPoint.docsReporter} ...`)
        entryPoint.report = await runDocsReport(
          entryPoint.docsReporter,
          entryPoint.file,
          changedFiles
        )
      }

      if (entryPoint.docsGenerator) {
        core.info(`Executing docs generator ${configInputs.docsGenerator} ...`)
        const docsDir = configInputs.docsDir
        await generateDocs(entryPoint.docsGenerator, entryPoint.file, docsDir)
        entryPoint.generatedDocsPath = docsDir
      }
    }

    await processReports(entryPoints)
    if (configInputs.docsTargetOwnerRepo) {
      // await openPr()
      await pushDocs(entryPoints)
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    console.error(error)
    if (error instanceof Error) core.setFailed(error.message)
  }
}
