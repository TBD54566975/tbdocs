import { generateTypedocMarkdown } from './typedoc-markdown'

import { EntryPoint } from '../interfaces'

export * from './interfaces'

/**
 * Generates the markdown files for the docs and open a PR to the target repo
 *
 * @beta
 **/
export const generateDocs = async (entryPoint: EntryPoint): Promise<string> => {
  switch (entryPoint.docsGenerator) {
    case 'typedoc-markdown':
      return generateTypedocMarkdown(entryPoint)
    default:
      throw new Error(`Unknown docs generator: ${entryPoint.docsGenerator}`)
  }
}
