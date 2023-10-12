import path from 'path'
import { readFileSync, writeFileSync } from 'fs'
import { Application } from 'typedoc'

import { EntryPoint } from '../interfaces'
import { loadTsconfigProps, lookupFile } from '../utils'

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
  console.info('>>> Generating docs...')

  const entryPointFile = entryPoint.file

  // Set project path if not set before by the doc-reporter
  if (!entryPoint.projectPath) {
    const entryPointDir = path.dirname(entryPointFile)
    const packageJsonPath = lookupFile(entryPointDir, 'package.json')
    entryPoint.projectPath = packageJsonPath
  }

  const { tsconfigFile } = await loadTsconfigProps(entryPoint.projectPath)

  console.info('>>> Typedoc Generator entryPoint', entryPointFile)
  const generatorApp = await Application.bootstrapWithPlugins({
    tsconfig: tsconfigFile,
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

  const outputDir = path.join(entryPoint.projectPath, '.tbdocs/docs')

  await generatorApp.generateDocs(projectReflection, outputDir)

  // Set project name if not set before
  if (!entryPoint.projectName) {
    entryPoint.projectName = projectReflection.packageName
  }

  addTitleToIndexFile(projectReflection.packageName, outputDir)

  return outputDir
}

const addTitleToIndexFile = (
  packageName = 'API Reference',
  outputDir: string
): void => {
  const indexMdPath = path.join(outputDir, ENTRY_DOCUMENT)
  const indexFrontMatter = `---\ntitle: '${packageName}'\n---\n\n`
  const indexMdContent = readFileSync(indexMdPath, 'utf8')
  const updatedIndexMdContent = indexFrontMatter + indexMdContent
  writeFileSync(indexMdPath, updatedIndexMdContent)
}
