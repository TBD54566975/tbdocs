import { Application } from 'typedoc'

import { configInputs } from './config'

export const generateDocs = async (): Promise<void> => {
  switch (configInputs.docsGenerator) {
    case 'typedoc-markdown':
      return generateTypedocMarkdown()
    default:
      throw new Error(`Unknown docs generator: ${configInputs.docsGenerator}`)
  }
}

const generateTypedocMarkdown = async (): Promise<void> => {
  console.log('Generating docs...')
  const generatorApp = await Application.bootstrapWithPlugins({
    entryPoints: ['./src/index.ts'],
    plugin: ['typedoc-plugin-markdown']
  })

  const projectReflection = await generatorApp.convert()
  if (!projectReflection) {
    throw new Error('Failed to generate docs')
  }

  await generatorApp.generateDocs(projectReflection, './docs')
}
