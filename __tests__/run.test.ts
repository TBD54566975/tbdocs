/**
 * Unit tests for the action's main functionality, src/main.ts
 *
 * These should be run as if the action was called from a workflow.
 * Specifically, the inputs listed in `action.yml` should be set as environment
 * variables following the pattern `INPUT_<INPUT_NAME>`.
 */

import * as core from '@actions/core'
import * as run from '../src/run'

// Mock the GitHub Actions core library
// const debugMock = jest.spyOn(core, 'debug')
// const getInputMock = jest.spyOn(core, 'getInput')
// const setFailedMock = jest.spyOn(core, 'setFailed')
// const setOutputMock = jest.spyOn(core, 'setOutput')
const warningMock = jest.spyOn(core, 'warning')
const errorMock = jest.spyOn(core, 'error')
const noticeMock = jest.spyOn(core, 'notice')

// Mock the action's main function
const runMock = jest.spyOn(run, 'run')

// Other utilities
// const timeRegex = /^\d{2}:\d{2}:\d{2}/

describe('action', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('sets the time output', async () => {
    // // Set the action's inputs as return values from core.getInput()
    // getInputMock.mockImplementation((name: string): string => {
    //   switch (name) {
    //     case 'milliseconds':
    //       return '500'
    //     default:
    //       return ''
    //   }
    // })

    await run.run()
    expect(runMock).toHaveReturned()
    expect(warningMock).toHaveBeenCalledTimes(14)
    expect(errorMock).toHaveBeenCalledTimes(0)
    expect(noticeMock).toHaveBeenCalledTimes(0)

    // // Verify that all of the core library functions were called correctly
    // expect(debugMock).toHaveBeenNthCalledWith(1, 'Waiting 500 milliseconds ...')
    // expect(debugMock).toHaveBeenNthCalledWith(
    //   2,
    //   expect.stringContaining('docs report')
    // )
    // expect(debugMock).toHaveBeenNthCalledWith(
    //   3,
    //   expect.stringMatching(timeRegex)
    // )
    // expect(debugMock).toHaveBeenNthCalledWith(
    //   4,
    //   expect.stringMatching(timeRegex)
    // )
    // expect(setOutputMock).toHaveBeenNthCalledWith(
    //   1,
    //   'time',
    //   expect.stringMatching(timeRegex)
    // )
  })

  // it('sets a failed status', async () => {
  //   // Set the action's inputs as return values from core.getInput()
  //   getInputMock.mockImplementation((name: string): string => {
  //     switch (name) {
  //       case 'milliseconds':
  //         return 'this is not a number'
  //       default:
  //         return ''
  //     }
  //   })

  //   await run.run()
  //   expect(runMock).toHaveReturned()

  //   // // Verify that all of the core library functions were called correctly
  //   // expect(setFailedMock).toHaveBeenNthCalledWith(
  //   //   1,
  //   //   'milliseconds not a number'
  //   // )
  // })
})
