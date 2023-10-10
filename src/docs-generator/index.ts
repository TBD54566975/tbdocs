import { generateTypedocMarkdown } from './typedoc-markdown'

import { DocsGeneratorType } from './interfaces'

export * from './interfaces'

/**
 * Generates the markdown files for the docs and open a PR to the target repo
 *
 * @beta
 **/
export const generateDocs = (
  docsGenerator: DocsGeneratorType,
  entryPointFile: string,
  outputDir: string
): Promise<void> => {
  switch (docsGenerator) {
    case 'typedoc-markdown':
      return generateTypedocMarkdown(entryPointFile, outputDir)
    default:
      throw new Error(`Unknown docs generator: ${docsGenerator}`)
  }
}
