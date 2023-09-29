import { Application } from 'typedoc'
import path from 'path'
import { existsSync } from 'fs'

import { configInputs } from './config'

// Required for the typedoc-plugin-markdown plugin
declare module 'typedoc' {
  export interface TypeDocOptionMap {
    entryDocument: string
  }
}

const GENERATED_DOCS_DIR = path.join(configInputs.projectPath, '.tbdocs/docs')

export const generateDocs = async (): Promise<void> => {
  switch (configInputs.docsGenerator) {
    case 'typedoc-markdown':
      return generateTypedocMarkdown()
    default:
      throw new Error(`Unknown docs generator: ${configInputs.docsGenerator}`)
  }
}

const generateTypedocMarkdown = async (): Promise<void> => {
  console.log('>>> Generating docs...')

  let entryPoint = path.join(configInputs.projectPath, 'src/index.ts')
  if (!existsSync(entryPoint)) {
    entryPoint = path.join(configInputs.projectPath, 'index.ts')
  }

  console.log('>>> Typedoc Generator entryPoint', entryPoint)
  const generatorApp = await Application.bootstrapWithPlugins({
    entryPoints: [entryPoint],
    skipErrorChecking: true,
    plugin: ['typedoc-plugin-markdown'],
    readme: 'none',
    entryDocument: 'index.md',
    disableSources: true
  })

  const projectReflection = await generatorApp.convert()
  if (!projectReflection) {
    throw new Error('Failed to generate docs')
  }

  await generatorApp.generateDocs(projectReflection, GENERATED_DOCS_DIR)
}
