import { generateReport } from '../src/docs-report'

describe('docs report', () => {
  it('generates an api-extractor report', async () => {
    const report = await generateReport('api-extractor', './api-extractor.json')
    expect(report.errorsCount).toBe(0)
    expect(report.messages).toHaveLength(13)
  })
})
