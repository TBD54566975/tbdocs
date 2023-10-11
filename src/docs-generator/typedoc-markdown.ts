import path from 'path'
import { readFileSync, writeFileSync } from 'fs'
import { Application } from 'typedoc'

import { EntryPoint } from '../interfaces'
import { lookupFile } from 'src/utils'

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

export const generateTypedocMarkdown = async (
  entryPoint: EntryPoint
): Promise<string> => {
  console.log('>>> Generating docs...')

  // TODO: improve this entry point search logic and allow it to be configurable too
  // let entryPoint = path.join(configInputs.projectPath, 'src/index.ts')
  // if (!existsSync(entryPoint)) {
  //   entryPoint = path.join(configInputs.projectPath, 'index.ts')
  // }
  // if (!existsSync(entryPoint)) {
  //   entryPoint = path.join(configInputs.projectPath, 'src/main.ts')
  // }
  // if (!existsSync(entryPoint)) {
  //   entryPoint = path.join(configInputs.projectPath, 'main.ts')
  // }
  const entryPointFile = entryPoint.file

  console.log('>>> Typedoc Generator entryPoint', entryPointFile)
  const generatorApp = await Application.bootstrapWithPlugins({
    entryPoints: [entryPointFile],
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

  // Set project name if not set before
  if (!entryPoint.projectName) {
    entryPoint.projectName = projectReflection.packageName
  }

  if (!entryPoint.projectPath) {
    const entryPointDir = path.dirname(entryPointFile)
    const packageJsonPath = lookupFile(entryPointDir, 'package.json')
    entryPoint.projectPath = packageJsonPath
  }

  const outputDir = path.join(entryPoint.projectPath, '.tbdocs/docs')

  await generatorApp.generateDocs(projectReflection, outputDir)

  addTitleToIndexFile(projectReflection.packageName, outputDir)

  return outputDir
}

const addTitleToIndexFile = (packageName = 'API Reference', outputDir: string): void => {
  const indexMdPath = path.join(outputDir, ENTRY_DOCUMENT)
  const indexFrontMatter = `---\ntitle: '${packageName}'\n---\n\n`
  const indexMdContent = readFileSync(indexMdPath, 'utf8')
  const updatedIndexMdContent = indexFrontMatter + indexMdContent
  writeFileSync(indexMdPath, updatedIndexMdContent)
}
