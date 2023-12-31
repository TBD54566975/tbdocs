import path from 'path'
import { simpleGit } from 'simple-git'
import { getBaseInfo } from './github'

/**
 * Git diff data for a file.
 *
 * @beta
 **/
export interface GitDiffs {
  /** Original line number */
  originalLine: number

  /** Original line offset */
  originalOffset?: number

  /** Updated line number */
  updatedLine: number

  /** Updated line offset */
  updatedOffset?: number
}

/**
 * Map of files and their diffs.
 *
 * @beta
 */
export type FilesDiffsMap = Record<string, GitDiffs[]>

const git = simpleGit()

export const getFilesDiffs = async (): Promise<FilesDiffsMap> => {
  const targetBase = getBaseInfo() || { ref: 'main' }

  // Since GH Actions checkout action doesn't fetch all the history, we need to do it manually
  const targetSha = await fetchGitHistory(targetBase.ref)
  console.info(`Git history fetched ref '${targetBase.ref}' successfully!`)

  const diffSummary = await git.diffSummary(['-U0', targetSha])

  const filesDiffsMap: FilesDiffsMap = {}

  for (const file of diffSummary.files) {
    const fileDiffs = await getFileDiffs(targetSha, file.file)

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

  console.info(`>>> Files diffs map comparing with ${targetSha}`, filesDiffsMap)
  return filesDiffsMap
}

const getFileDiffs = async (
  targetShaOrRef: string,
  filePath: string
): Promise<string> => {
  try {
    const diffs = await git.diff(['-U0', targetShaOrRef, filePath])
    return diffs
  } catch (error) {
    if ((error as Error).message?.includes('path not in the working tree')) {
      // file was removed, no diffs to be parsed
      return ''
    } else {
      throw error
    }
  }
}

export const isSourceInChangedScope = (
  filesDiffs: FilesDiffsMap,
  sourceFilePath: string,
  sourceFileLine?: number
): boolean => {
  const changedLines = filesDiffs[sourceFilePath]

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

const fetchGitHistory = async (targetBranch: string): Promise<string> => {
  // needed for the docker container to work
  console.info(">>> Setting git config 'safe.directory' to '/github/workspace'")

  await git.raw([
    'config',
    '--global',
    '--add',
    'safe.directory',
    process.cwd()
  ])

  // fetching origin
  console.info('>>> Fetching origin')

  await git.raw([
    'fetch',
    '--depth=1',
    'origin',
    `+refs/heads/${targetBranch}:refs/remotes/origin/${targetBranch}`
  ])

  const sha = await git.revparse([`origin/${targetBranch}`])
  console.info(`>>> Origin fetched sha: ${sha}`)

  return sha
}
