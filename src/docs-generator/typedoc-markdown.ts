import path from 'path'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { Application } from 'typedoc'

import { configInputs } from '../config'

// Required for the typedoc-plugin-markdown plugin
declare module 'typedoc' {
  export interface TypeDocOptionMap {
    entryDocument: string
    hidePageTitle: boolean
    hideBreadcrumbs: boolean
    hideInPageTOC: boolean
  }
}

const ENTRY_DOCUMENT = 'index.md'

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
    entryDocument: ENTRY_DOCUMENT,
    disableSources: true,
    hidePageTitle: true,
    hideBreadcrumbs: true,
    hideInPageTOC: true,
    githubPages: false
  })

  const projectReflection = await generatorApp.convert()
  if (!projectReflection) {
    throw new Error('Failed to generate docs')
  }

  await generatorApp.generateDocs(projectReflection, configInputs.docsDir)

  addTitleToIndexFile(projectReflection.packageName)
}

const addTitleToIndexFile = (packageName = 'API Reference'): void => {
  const indexMdPath = path.join(configInputs.docsDir, ENTRY_DOCUMENT)
  const indexFrontMatter = `---\ntitle: '${packageName}'\n---\n\n`
  const indexMdContent = readFileSync(indexMdPath, 'utf8')
  const updatedIndexMdContent = indexFrontMatter + indexMdContent
  writeFileSync(indexMdPath, updatedIndexMdContent)
}
