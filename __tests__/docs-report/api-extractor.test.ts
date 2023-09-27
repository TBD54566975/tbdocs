import { generateApiExtractorReport } from '../../src/docs-report/api-extractor'

describe('docs report', () => {
  it('generates an api-extractor report', async () => {
    const report = await generateApiExtractorReport()
    expect(report.errorsCount).toBe(0)
    expect(report.messages).toHaveLength(9)
  })
})
