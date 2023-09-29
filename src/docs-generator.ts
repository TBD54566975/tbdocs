import { Application } from 'typedoc'
import path from 'path'
import { existsSync, readFileSync, readdirSync } from 'fs'
import * as github from '@actions/github'

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
      await generateTypedocMarkdown()
    default:
      throw new Error(`Unknown docs generator: ${configInputs.docsGenerator}`)
  }

  if (configInputs.docsTargetOwnerRepo && configInputs.docsTargetBranch) {
    await openPr()
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

/**
 * Open a PR to Github with the generated docs
 */
const openPr = async (): Promise<void> => {
  console.log('>>> Opening PR...')

  const octokit = github.getOctokit(configInputs.token)
  const [targetOwner, targetRepo] = configInputs.docsTargetOwnerRepo.split('/')
  const targetBranch = configInputs.docsTargetBranch
  const targetBase = configInputs.docsTargetPrBaseBranch
  const targetRepoPath = configInputs.docsTargetRepoPath

  if (
    !targetOwner ||
    !targetRepo ||
    !targetBranch ||
    !targetBase ||
    !targetRepoPath
  ) {
    throw new Error(
      `Missing targetOwner, targetRepo, targetBranch, targetBase, or targetRepoPath`
    )
  }

  console.info('Open PR data', {
    targetOwner,
    targetRepo,
    targetBranch,
    targetBase,
    targetRepoPath
  })

  await createBranch(octokit, targetOwner, targetRepo, targetBranch, targetBase)
  await pushDocsToBranch(
    octokit,
    targetOwner,
    targetRepo,
    targetBranch,
    targetRepoPath
  )

  // await createOrUpdatePr(
  //   octokit,
  //   targetOwner,
  //   targetRepo,
  //   targetBranch,
  //   targetBase,
  //   targetRepoPath
  // )
}

/**
 * Check if the branch exists, if not create it
 */
const createBranch = async (
  octokit: ReturnType<typeof github.getOctokit>,
  targetOwner: string,
  targetRepo: string,
  targetBranch: string,
  targetBase: string
) => {
  console.info(`>>> Checking if branch ${targetBranch} exists...`)
  const branch = await octokit.rest.repos.getBranch({
    owner: targetOwner,
    repo: targetRepo,
    branch: targetBranch
  })

  if (!branch) {
    console.info(`>>> Branch ${targetBranch} does not exist. Creating...`)

    console.info(`>>> Getting base branch ${targetBase} sha...`)
    const { data: baseBranchData } = await octokit.rest.repos.getBranch({
      owner: targetOwner,
      repo: targetRepo,
      branch: targetBase
    })

    const baseSha = baseBranchData.commit.sha
    console.info(
      `>>> Creating branch ${targetBranch} with sha ${baseSha.slice(0, 7)}...`
    )
    await octokit.rest.git.createRef({
      owner: targetOwner,
      repo: targetRepo,
      ref: `refs/heads/${targetBranch}`,
      sha: baseSha
    })
  }
}

const pushDocsToBranch = async (
  octokit: ReturnType<typeof github.getOctokit>,
  targetOwner: string,
  targetRepo: string,
  targetBranch: string,
  targetRepoPath: string
) => {
  const files = readdirSync(GENERATED_DOCS_DIR, { recursive: true }) as string[]

  const blobs = await Promise.all(
    files.map(async file => {
      const content = readFileSync(path.join(GENERATED_DOCS_DIR, file))
      const blobData = await octokit.rest.git.createBlob({
        owner: targetOwner,
        repo: targetRepo,
        content: content.toString('base64'),
        encoding: 'base64'
      })

      return {
        path: path.join(targetRepoPath, file),
        mode: '100644' as '100644',
        type: 'blob' as 'blob',
        sha: blobData.data.sha
      }
    })
  )

  const { data: refData } = await octokit.rest.git.getRef({
    owner: targetOwner,
    repo: targetRepo,
    ref: `heads/${targetBranch}`
  })
  const commitSHA = refData.object.sha
  const { data: commitData } = await octokit.rest.git.getCommit({
    owner: targetOwner,
    repo: targetRepo,
    commit_sha: commitSHA
  })

  const { data: treeData } = await octokit.rest.git.createTree({
    owner: targetOwner,
    repo: targetRepo,
    tree: blobs,
    base_tree: commitData.tree.sha
  })

  const { data: newCommitData } = await octokit.rest.git.createCommit({
    owner: targetOwner,
    repo: targetRepo,
    message: `tbdocs: committing generated docs files ${github.context.runId}-${github.context.runNumber}`,
    tree: treeData.sha,
    parents: [commitSHA]
  })

  await octokit.rest.git.updateRef({
    owner: targetOwner,
    repo: targetRepo,
    ref: `heads/${targetBranch}`,
    sha: newCommitData.sha
  })
}
