import path from 'path'
import { existsSync } from 'fs'
import { Application } from 'typedoc'

import { configInputs } from '../config'

// Required for the typedoc-plugin-markdown plugin
declare module 'typedoc' {
  export interface TypeDocOptionMap {
    entryDocument: string
  }
}

export const generateTypedocMarkdown = async (): Promise<void> => {
  console.log('>>> Generating docs...')

  // TODO: improve this entry point search logic and allow it to be configurable too
  let entryPoint = path.join(configInputs.projectPath, 'src/index.ts')
  if (!existsSync(entryPoint)) {
    entryPoint = path.join(configInputs.projectPath, 'index.ts')
  }
  if (!existsSync(entryPoint)) {
    entryPoint = path.join(configInputs.projectPath, 'src/main.ts')
  }
  if (!existsSync(entryPoint)) {
    entryPoint = path.join(configInputs.projectPath, 'main.ts')
  }

  console.log('>>> Typedoc Generator entryPoint', entryPoint)
  const generatorApp = await Application.bootstrapWithPlugins({
    entryPoints: [entryPoint],
    skipErrorChecking: true,
    plugin: ['typedoc-plugin-markdown'],
    readme: 'none',
    entryDocument: 'index.md',
    disableSources: true,
    githubPages: false
  })

  const projectReflection = await generatorApp.convert()
  if (!projectReflection) {
    throw new Error('Failed to generate docs')
  }

  await generatorApp.generateDocs(projectReflection, configInputs.docsDir)
}
