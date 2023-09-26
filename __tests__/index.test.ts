/**
 * Unit tests for src/index.ts
 */

import * as lib from '../src/index'
import { expect } from '@jest/globals'

describe('index.ts', () => {
  it('exports the run function', async () => {
    expect(lib.run).toBeDefined()
  })
})
