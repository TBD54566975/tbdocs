/**
 * Unit tests for the action's main functionality, src/main.ts
 *
 * These should be run as if the action was called from a workflow.
 * Specifically, the inputs listed in `action.yml` should be set as environment
 * variables following the pattern `INPUT_<INPUT_NAME>`.
 */

import * as core from '@actions/core'
import * as run from '../src/run'
import * as docsReport from '../src/docs-report'

const debugMock = jest.spyOn(core, 'debug')
const setFailedMock = jest.spyOn(core, 'setFailed')
const runDocsReportMock = jest.spyOn(docsReport, 'runDocsReport')
const runMock = jest.spyOn(run, 'run')

// mock @actions/github with jest
jest.mock('@actions/github', () => ({
  context: {
    repo: {
      owner: 'mocked-owner',
      repo: 'mocked-repo'
    },
    issue: {
      number: 1
    }
  },
  getOctokit: jest.fn().mockImplementation(() => {
    return {
      rest: {
        issues: {
          createComment: jest.fn().mockResolvedValue({
            data: {
              id: 12345,
              url: `https://github.com/mocked-owner/mocked-repo/issues/1#issuecomment-12345`
            }
          })
        }
      }
    }
  })
}))

describe('action', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('sets the time output', async () => {
    await run.run()
    expect(runMock).toHaveReturned()
    expect(runDocsReportMock).toHaveBeenCalledTimes(1)
    expect(debugMock).toHaveBeenCalledTimes(1)
    expect(setFailedMock).toHaveBeenCalledTimes(0)
  })

  it('sets a failed status', async () => {
    runDocsReportMock.mockImplementation(() => {
      throw new Error('failed')
    })

    await run.run()
    expect(runMock).toHaveReturned()

    // Verify that all of the core library functions were called correctly
    expect(setFailedMock).toHaveBeenNthCalledWith(1, 'failed')
  })
})
