import { configInputs } from '../config'
import { openPr } from './open-pr'

import { generateTypedocMarkdown } from './typedoc-markdown'

export * from './interfaces'

/**
 * Generates the markdown files for the docs and open a PR to the target repo
 *
 * @beta
 **/
export const generateDocs = async (): Promise<void> => {
  switch (configInputs.docsGenerator) {
    case 'typedoc-markdown':
      await generateTypedocMarkdown()
      break
    default:
      throw new Error(`Unknown docs generator: ${configInputs.docsGenerator}`)
  }

  if (configInputs.docsTargetOwnerRepo) {
    await openPr()
  }
}
