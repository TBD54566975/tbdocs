import { generateApiExtractorReport } from '../../src/docs-report/api-extractor'

describe('docs report', () => {
  it('generates an api-extractor report', async () => {
    const report = await generateApiExtractorReport({ file: 'src/index.ts' })
    expect(report.errorsCount).toBeDefined()
    expect(report.messages).toBeDefined()
  })
})
