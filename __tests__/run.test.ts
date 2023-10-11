/**
 * Unit tests for the action's main functionality, src/main.ts
 *
 * These should be run as if the action was called from a workflow.
 * Specifically, the inputs listed in `action.yml` should be set as environment
 * variables following the pattern `INPUT_<INPUT_NAME>`.
 */
import * as core from '@actions/core'
import { runDocsReport } from '../src/docs-report'
import { run } from '../src/run'
import { generateDocs } from '../src/docs-generator'
import * as config from '../src/config'

// Mocking the imported modules and values
jest.mock('@actions/core', () => ({
  debug: jest.fn(),
  setFailed: jest.fn(),
  getInput: jest.fn()
}))

jest.mock('../src/docs-report', () => ({
  runDocsReport: jest.fn()
}))

jest.mock('../src/docs-generator', () => ({
  generateDocs: jest.fn()
}))

jest.mock('../src/github', () => ({
  handleGithubDocsReport: jest.fn(),
  handleGithubGeneratedDocs: jest.fn()
}))

const consoleInfoMock = jest.spyOn(console, 'info')

describe('run function', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should execute runDocsReport', async () => {
    jest.spyOn(config, 'getInputEntryPoints').mockImplementationOnce(() => [
      {
        file: 'src/index.ts',
        docsReporter: 'api-extractor'
      }
    ])

    await run()

    expect(consoleInfoMock).toHaveBeenCalledWith(
      'Executing docs reporter api-extractor ...'
    )
    expect(runDocsReport).toHaveBeenCalledTimes(1)
  })

  it('should execute docsGenerator', async () => {
    jest.spyOn(config, 'getInputEntryPoints').mockImplementationOnce(() => [
      {
        file: 'src/index.ts',
        docsGenerator: 'typedoc-markdown'
      }
    ])

    await run()

    expect(consoleInfoMock).toHaveBeenCalledWith(
      'Executing docs generator typedoc-markdown ...'
    )
    expect(generateDocs).toHaveBeenCalledTimes(1)
  })

  it('should call core.setFailed on error', async () => {
    const runDocsReportMock = runDocsReport as jest.Mock
    runDocsReportMock.mockImplementationOnce(() => {
      throw new Error('Mocked error')
    })

    // jest.spyOn(config, 'getInputEntryPoints').mockImplementationOnce(() => [
    //   {
    //     file: 'src/index.ts',
    //     docsReporter: 'api-extractor',
    //     docsGenerator: 'typedoc-markdown'
    //   }
    // ])

    await run()

    expect(core.setFailed).toHaveBeenCalledWith('Mocked error')
  })
})
