import * as core from '@actions/core'

import { configInputs, getInputEntryPoints } from './config'
import { runDocsReport, generateReportMarkdown } from './docs-report'
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
      failOnWarnings,
      docsGrouped
    } = configInputs

    const entryPoints = getInputEntryPoints()
    console.info('Processing EntryPoints >>>', entryPoints)

    const changedFiles = reportChangedScopeOnly
      ? await getFilesDiffs()
      : undefined

    const groupedGeneratedDocsEntryPoints = []

    for (const entryPoint of entryPoints) {
      console.info(`Processing entry point ${entryPoint.file}...`)

      if (entryPoint.docsReporter) {
        console.info(`Executing docs reporter ${entryPoint.docsReporter} ...`)
        entryPoint.report = await runDocsReport(entryPoint, changedFiles)
      }

      if (entryPoint.docsGenerator && docsGrouped) {
        groupedGeneratedDocsEntryPoints.push(entryPoint)
      } else if (entryPoint.docsGenerator) {
        console.info(`Executing docs generator ${entryPoint.docsGenerator} ...`)
        entryPoint.generatedDocsPath = await generateDocs([entryPoint])
      }

      console.info(
        JSON.stringify(
          {
            report: entryPoint.report,
            generatedDocsPath: entryPoint.generatedDocsPath
          },
          null,
          2
        )
      )
    }

    if (groupedGeneratedDocsEntryPoints.length > 0) {
      console.info('Executing docs generator in group mode...')
      const generatedDocsPath = await generateDocs(
        groupedGeneratedDocsEntryPoints
      )
      console.info(`Generated docs at path ${generatedDocsPath}`)
    }

    const reportMarkdown = await generateReportMarkdown(entryPoints)

    await handleGithubDocsReport(
      entryPoints,
      reportMarkdown,
      failOnError,
      failOnWarnings
    )

    if (docsTargetOwnerRepo) {
      await handleGithubGeneratedDocs(entryPoints)
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    console.error(error)
    if (error instanceof Error) core.setFailed(error.message)
  }
}
