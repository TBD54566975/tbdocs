import { setOutput, warning } from '@actions/core'
import simpleGit from 'simple-git'

import { commentReportSummary } from './comment-report'
import { DocsReport } from '.'
import { annotateCode } from './annotate-code'
import { generateApiExtractorReport } from './api-extractor'
import { configInputs } from '../config'

export * from './interfaces'

/**
 * Runs the docs reporter to extract any docs errors/mistakes and processes
 * the results by annotating the code files and creating a PR comment.
 *
 * @beta
 **/
export const runDocsReport = async (): Promise<void> => {
  const report = await generateReport()
  await processReport(report)
  setReportResults(report)
}

const generateReport = async (): Promise<DocsReport> => {
  switch (configInputs.docsReporter) {
    case 'api-extractor':
      return generateApiExtractorReport()
    default:
      throw new Error(`Unknown docs report: ${configInputs.docsReporter}`)
  }
}

const processReport = async (report: DocsReport): Promise<void> => {
  console.info(`Report: ${JSON.stringify(report, undefined, 2)}`)

  const filesDiffs = await getFilesDiffs()
  console.info(JSON.stringify(filesDiffs, undefined, 2))

  annotateCode(report.messages)
  await commentReportSummary(report)
}

const setReportResults = (report: DocsReport): void => {
  if (report.errorsCount > 0) {
    const errorMessage = `Docs report ${report.reporter} failed with ${report.errorsCount} errors.`
    console.error(errorMessage)
    if (configInputs.failOnError) {
      throw new Error(errorMessage)
    }
  }

  if (report.warningsCount > 0) {
    const warningMessage = `Docs report ${report.reporter} completed with ${report.warningsCount} warnings.`
    warning(warningMessage)
    if (configInputs.failOnWarnings) {
      throw new Error(warningMessage)
    }
  }

  // Set outputs for other workflow steps to use
  setOutput('report', JSON.stringify(report))
}

interface FileDiffs {
  filePath: string
  diffs: {
    startLine: number
    startOffset: number
    endLine?: number
    endOffset?: number
  }[]
}

const git = simpleGit()

const getFilesDiffs = async (): Promise<FileDiffs[]> => {
  // using -U0 to get the minimal context in the diff
  const diffSummary = await git.diffSummary(['-U0'])

  const diffFilesWithLines: FileDiffs[] = []

  for (const file of diffSummary.files) {
    const fileDiffs = await git.diff(['-U0', file.file])

    const changedLines = fileDiffs
      .split('\n')
      .filter(line => line.startsWith('@@'))
      .map(line =>
        (line.match(/@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@/) || [])
          .filter(str => str && !isNaN(+str))
          .map(Number)
      )
      .filter(diffNumbers => diffNumbers.length >= 3)
      .map(([startLine, startOffset, endLine, endOffset]) => {
        return { startLine, startOffset, endLine, endOffset }
      })

    diffFilesWithLines.push({
      filePath: file.file,
      diffs: changedLines
    })
  }

  return diffFilesWithLines
}