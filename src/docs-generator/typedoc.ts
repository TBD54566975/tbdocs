import path from 'path'
import { readFileSync, writeFileSync } from 'fs'
import { Application, TypeDocOptions } from 'typedoc'

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

export const generateTypedoc = async (
  entryPoints: EntryPoint[],
  isMarkdown?: boolean
): Promise<string> => {
  console.info('>>> Generating docs...')

  const isGrouped = entryPoints.length > 1

//     # Or for more control over when each package is built, we can manually build each
// # package and save the output of --json
// # Cross-package links will be invalid here, they will be validated when merging
// npx typedoc --json docs-json/bar.json --options packages/bar/typedoc.json --validation.invalidLink false
// npx typedoc --json docs-json/baz.json --options packages/baz/typedoc.json --validation.invalidLink false
// npx typedoc --json docs-json/foo.json --options packages/foo/typedoc.json --validation.invalidLink false
// # Merge previously generated documentation together into a site
// npx typedoc --entryPointStrategy merge "docs-json/*.json"

  for (const entryPoint of entryPoints) {
    const entryPointFile = entryPoint.file

    // Set project path if not set before by the doc-reporter
    if (!entryPoint.projectPath) {
      const entryPointDir = path.dirname(entryPointFile)
      const packageJsonPath = lookupFile(entryPointDir, 'package.json')
      entryPoint.projectPath = packageJsonPath
    }

    const { tsconfigFile } = await loadTsconfigProps(entryPoint.projectPath)

    let generatorConfig: Partial<TypeDocOptions> = {
      tsconfig: tsconfigFile,
      entryPoints: [entryPointFile],
      skipErrorChecking: true,
      disableSources: true,
      readme: 'none',
      includeVersion: true,
    }

    if (isMarkdown) {
      generatorConfig = {
        ...generatorConfig,
        plugin: ['typedoc-plugin-markdown'],
        entryDocument: ENTRY_DOCUMENT,
        hidePageTitle: true,
        hideBreadcrumbs: true,
        hideInPageTOC: true,
        githubPages: false
      }
    }

    if (isGrouped) {
      generatorConfig.json = `docs-${entryPoint.packageName}.json`
      generatorConfig.validation = {
        invalidLink: false
      }
    }

    console.info(
      '>>> Typedoc Generator entryPoint',
      entryPointFile,
      generatorConfig
    )
    const generatorApp = await Application.bootstrapWithPlugins(generatorConfig)

    const projectReflection = await generatorApp.convert()
    if (!projectReflection) {
      throw new Error('Failed to generate docs')
    }

    const outputDir = `.tbdocs/docs/${projectReflection.packageName}`
    await generatorApp.generateDocs(projectReflection, outputDir)
    entryPoint.generatedDocsPath = outputDir

    // Set project name if not set before
    if (!entryPoint.projectName) {
      entryPoint.projectName = projectReflection.packageName
    }

    if (isMarkdown) {
      addTitleToIndexFile(projectReflection.packageName, outputDir)
    }
  }



  const outputDir = entryPoints[0].generatedDocsPath
  return outputDir || ""
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
