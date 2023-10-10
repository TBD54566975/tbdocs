import * as core from '@actions/core'
import { setOutput, warning } from '@actions/core'

import { configInputs } from './config'
import { DocsReport, runDocsReport } from './docs-report'
import { generateDocs } from './docs-generator'
import { EntryPoint } from './interfaces'
import { getFilesDiffs } from './utils'
import { annotateCode } from './github/annotate-code'
import { commentReportSummary } from './github/comment-report'

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

    await handleGithubDocsReport(entryPoints)
    await handleGithubGeneratedDocs(entryPoints)
  } catch (error) {
    // Fail the workflow run if an error occurs
    console.error(error)
    if (error instanceof Error) core.setFailed(error.message)
  }
}

const handleGithubDocsReport = async (
  entryPoints: EntryPoint[]
): Promise<void> => {
  await processReports(entryPoints)
  setReportResults(entryPoints)
}

const handleGithubGeneratedDocs = async (entryPoints: EntryPoint[]) => {
  if (configInputs.docsTargetOwnerRepo) {
    // await openPr()
    // await pushDocs(entryPoints)
  }
}

const processReports = async (entryPoints: EntryPoint[]): Promise<void> => {
  for (const { report, file } of entryPoints) {
    if (report) {
      console.info(`Report: ${JSON.stringify(report, undefined, 2)}`)
      annotateCode(report.messages)
      await commentReportSummary(report)
    } else {
      console.info(`Skipping report processing for entry point ${file}...`)
    }
  }
}

const setReportResults = (entryPoints: EntryPoint[]): void => {
  const errors: string[] = []
  const warnings: string[] = []
  const reportsSummaryData: (Omit<DocsReport, 'messages'> & {
    entryPointFile: string
  })[] = []

  for (const { report, file } of entryPoints) {
    if (!report) {
      continue
    }

    if (report.errorsCount > 0) {
      const errorMessage = `Docs report ${report.reporter} failed with ${report.errorsCount} errors.`
      console.error(errorMessage)
    }

    if (report.warningsCount > 0) {
      const warningMessage = `Docs report ${report.reporter} completed with ${report.warningsCount} warnings.`
      warning(warningMessage)
    }

    const { messages, ...reportSummary } = report
    reportsSummaryData.push({ entryPointFile: file, ...reportSummary })
  }

  if (configInputs.failOnError && errors.length > 0) {
    throw new Error(errors.join('\n'))
  }

  if (configInputs.failOnWarnings && warnings.length > 0) {
    throw new Error(warnings.join('\n'))
  }

  // Set outputs for other workflow steps to use
  setOutput('report', JSON.stringify(reportsSummaryData))
}
