import { readFileSync, existsSync } from 'fs'
import path from 'path'

export const lookupFile = (fileName: string, dir?: string): string => {
  const currentDirectory = dir ?? process.cwd()
  console.info(`Looking for ${fileName} in ${currentDirectory}...`)

  const filePath = path.join(currentDirectory, fileName)
  if (existsSync(filePath)) {
    console.info(`Found ${filePath}!`)
    return filePath
  } else {
    // lookup in the parent folder
    const parentDirectory = path.join(currentDirectory, '..')

    // check for not being in the root folder twice
    if (parentDirectory !== currentDirectory) {
      return lookupFile(fileName, parentDirectory)
    } else {
      throw new Error(`Could not find ${fileName}`)
    }
  }
}

export const getJsonFile = <T>(filePath: string): T => {
  const jsonFile = readFileSync(filePath, 'utf-8')
  return JSON.parse(jsonFile) as T
}
