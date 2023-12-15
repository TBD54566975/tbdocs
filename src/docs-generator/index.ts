import { generateTypedoc } from './typedoc'

import { EntryPoint } from '../interfaces'

export * from './interfaces'

/**
 * Generates the markdown files for the docs and open a PR to the target repo
 *
 * @beta
 **/
export const generateDocs = async (
  entryPoints: EntryPoint[]
): Promise<string> => {
  const firstEntryPoint = entryPoints[0]
  switch (firstEntryPoint.docsGenerator) {
    case 'typedoc-markdown':
      return generateTypedoc(entryPoints, true)
    case 'typedoc-html':
      return generateTypedoc(entryPoints, false)
    default:
      throw new Error(
        `Unknown docs generator: ${firstEntryPoint.docsGenerator}`
      )
  }
}
