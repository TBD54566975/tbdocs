import { DocsReport } from '.'

export const commentReportSummary = async (
  report: DocsReport
): Promise<void> => {
  // TODO: comment report!
  console.info({
    summary: { errors: report.errorsCount, warnings: report.warningsCount }
  })
}
