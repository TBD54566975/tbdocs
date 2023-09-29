/**
 * Unit tests for the action's main functionality, src/main.ts
 *
 * These should be run as if the action was called from a workflow.
 * Specifically, the inputs listed in `action.yml` should be set as environment
 * variables following the pattern `INPUT_<INPUT_NAME>`.
 */

// Mocking the imported modules and values
jest.mock('@actions/core', () => ({
  debug: jest.fn(),
  setFailed: jest.fn()
}))

jest.mock('../src/config', () => ({
  configInputs: {
    docsReporter: false,
    docsGenerator: false
  }
}))

jest.mock('../src/docs-report', () => ({
  runDocsReport: jest.fn()
}))

jest.mock('../src/docs-generator', () => ({
  generateDocs: jest.fn()
}))

import * as core from '@actions/core'
import { configInputs } from '../src/config'
import { runDocsReport } from '../src/docs-report'
import { run } from '../src/run'
import { generateDocs } from '../src/docs-generator'

describe('run function', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should execute runDocsReport', async () => {
    configInputs.docsReporter = 'api-extractor'

    await run()

    expect(core.debug).toHaveBeenCalledWith(
      'Executing docs reporter api-extractor ...'
    )
    expect(runDocsReport).toHaveBeenCalledTimes(1)
  })

  it('should execute docsGenerator', async () => {
    configInputs.docsGenerator = 'typedoc-markdown'

    await run()

    expect(core.debug).toHaveBeenCalledWith(
      'Executing docs generator typedoc-markdown ...'
    )
    expect(generateDocs).toHaveBeenCalledTimes(1)
  })

  it('should call core.setFailed on error', async () => {
    const runDocsReportMock = runDocsReport as jest.Mock
    runDocsReportMock.mockImplementationOnce(() => {
      throw new Error('Mocked error')
    })

    configInputs.docsReporter = 'api-extractor'

    await run()

    expect(core.setFailed).toHaveBeenCalledWith('Mocked error')
  })
})
