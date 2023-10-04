import path from 'path'
import { simpleGit } from 'simple-git'

export interface GitDiffs {
  originalLine: number
  originalOffset?: number
  updatedLine: number
  updatedOffset?: number
}

export type FilesDiffsMap = Record<string, GitDiffs[]>

const git = simpleGit()

export const getFilesDiffs = async (
  targetBranchOrSha: string
): Promise<FilesDiffsMap> => {
  const diffSummary = await git.diffSummary(['-U0', targetBranchOrSha])

  const filesDiffsMap: FilesDiffsMap = {}

  for (const file of diffSummary.files) {
    const fileDiffs = await git.diff(['-U0', targetBranchOrSha, file.file])

    const changedLines: GitDiffs[] = fileDiffs
      .split('\n')
      .filter(line => line.startsWith('@@'))
      .map(line => line.match(/@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@/) as string[])
      .filter(line => line !== null)
      .map((regexMatchedArray: string[]) => {
        const originalLine = Number(regexMatchedArray[1])
        const originalOffset = regexMatchedArray[2]
          ? Number(regexMatchedArray[2])
          : undefined
        const updatedLine = Number(regexMatchedArray[3])
        const updatedOffset = regexMatchedArray[4]
          ? Number(regexMatchedArray[4])
          : undefined

        return { originalLine, originalOffset, updatedLine, updatedOffset }
      })

    const fullFilePath = path.join(process.cwd(), file.file)
    filesDiffsMap[fullFilePath] = changedLines
  }

  console.info(
    `>>> Files diffs map comparing with ${targetBranchOrSha}`,
    filesDiffsMap
  )
  return filesDiffsMap
}

export const isSourceInChangedScope = (
  filesDiffs: FilesDiffsMap,
  sourceFilePath: string,
  sourceFileLine?: number
): boolean => {
  const changedLines = filesDiffs[sourceFilePath]

  console.info(
    `>>> Analyzing ${sourceFilePath} at line ${sourceFileLine}`,
    changedLines
  )

  // if file is not changed, ignore
  if (!changedLines) {
    return false
  }

  // if line is not specified, it means the whole file is changed
  if (!sourceFileLine) {
    return true
  }

  return changedLines.some(
    ({ updatedLine, updatedOffset }) =>
      sourceFileLine >= updatedLine &&
      sourceFileLine <= updatedLine + (updatedOffset || 0)
  )
}
