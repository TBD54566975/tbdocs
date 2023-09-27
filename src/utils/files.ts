import { readFileSync, existsSync } from 'fs'
import path from 'path'

export const lookupFile = (fileName: string, dir?: string): string => {
  const currentDirectory = dir ?? process.cwd()

  const packageJsonPath = path.join(currentDirectory, fileName)
  if (existsSync(packageJsonPath)) {
    return packageJsonPath
  } else {
    // lookup in the parent folder
    const parentDirectory = path.join(currentDirectory, '..')

    // check for not being in the root folder twice
    if (parentDirectory !== currentDirectory) {
      return lookupFile(parentDirectory)
    } else {
      throw new Error(`Could not find ${fileName}`)
    }
  }
}

export const getJsonFile = <T>(filePath: string): T => {
  const jsonFile = readFileSync(filePath)
  return JSON.parse(jsonFile.toString()) as T
}

interface TsConfigRequiredFields {
  compilerOptions?: {
    declaration?: boolean
    declarationMap?: boolean
  }
}

export const checkTsconfigProps = (projectPath: string): void => {
  const tsConfigFilePath = lookupFile('tsconfig.json', projectPath)
  const tsConfig = getJsonFile<TsConfigRequiredFields>(tsConfigFilePath)
  if (
    !tsConfig.compilerOptions ||
    !tsConfig.compilerOptions.declaration ||
    !tsConfig.compilerOptions.declarationMap
  ) {
    throw new Error(
      'tsconfig.json must have declaration and declarationMap set to true'
    )
  }
}
