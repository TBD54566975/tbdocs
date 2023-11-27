import { setOutput, warning } from '@actions/core'

import { EntryPoint } from '../interfaces'
import { DocsReport } from '../docs-report'
import { pushDocsPr } from './docs-pr'
import { annotateCode } from './annotate-code'

export const handleGithubGeneratedDocs = async (
  entryPoints: EntryPoint[]
): Promise<void> => {
  return pushDocsPr(entryPoints)
}

export const handleGithubDocsReport = async (
  entryPoints: EntryPoint[],
  failOnError: boolean,
  failOnWarnings: boolean
): Promise<void> => {
  // annotate code in github
  for (const { report } of entryPoints) {
    if (report) {
      annotateCode(report.messages)
    }
  }

  // handle reports summary logs
  getReportResults(entryPoints, failOnError, failOnWarnings)
}

const getReportResults = (
  entryPoints: EntryPoint[],
  failOnError: boolean,
  failOnWarnings: boolean
): void => {
  const errors: string[] = []
  const warnings: string[] = []
  const reportsSummaryData: (Omit<DocsReport, 'messages'> & {
    entryPointFile: string
  })[] = []

  for (const { report, file, projectName, projectPath } of entryPoints) {
    if (!report) {
      continue
    }

    const projectPrefix = projectName || projectPath || file

    if (report.errorsCount > 0) {
      const errorMessage = `${projectPrefix} - Docs report ${report.reporter} failed with ${report.errorsCount} errors.`
      console.error(errorMessage)
      errors.push(errorMessage)
    }

    if (report.warningsCount > 0) {
      const warningMessage = `${projectPrefix} - Docs report ${report.reporter} completed with ${report.warningsCount} warnings.`
      warning(warningMessage)
      warnings.push(warningMessage)
    }

    const { messages, ...reportSummary } = report
    reportsSummaryData.push({ entryPointFile: file, ...reportSummary })
  }

  if (failOnError && errors.length > 0) {
    throw new Error(errors.join('\n'))
  }

  if (failOnWarnings && warnings.length > 0) {
    throw new Error(warnings.join('\n'))
  }

  // Set outputs for other workflow steps to use
  setOutput('report', JSON.stringify(reportsSummaryData))
}
