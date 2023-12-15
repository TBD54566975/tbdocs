import { generateTypedoc } from './typedoc'

import { EntryPoint } from '../interfaces'
import { typedocHtmlGroup } from './typedoc-html-group'

export * from './interfaces'

/**
 * Generates the markdown files for the docs and open a PR to the target repo
 *
 * @beta
 **/
export const generateDocs = async (entryPoint: EntryPoint): Promise<string> => {
  switch (entryPoint.docsGenerator) {
    case 'typedoc-markdown':
      return generateTypedoc(entryPoint, true)
    case 'typedoc-html':
      return generateTypedoc(entryPoint, false)
    default:
      throw new Error(`Unknown docs generator: ${entryPoint.docsGenerator}`)
  }
}

/**
 * Groups all the generated docs into a single docs folder
 *
 * @beta
 */
export const groupDocs = async (entryPoints: EntryPoint[]): Promise<void> => {
  const entryPoint = entryPoints[0]
  switch (entryPoint.docsGenerator) {
    case 'typedoc-html':
      return typedocHtmlGroup(entryPoints)
    default:
      throw new Error(
        `Unsupported merging for docs generator: ${entryPoint.docsGenerator}`
      )
  }
}
