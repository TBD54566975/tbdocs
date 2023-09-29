import { Application } from 'typedoc'
import path from 'path'
import { existsSync, readFileSync, readdirSync } from 'fs'
import * as github from '@actions/github'

import { configInputs } from './config'
import { wait } from './utils'

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
      break
    default:
      throw new Error(`Unknown docs generator: ${configInputs.docsGenerator}`)
  }

  if (configInputs.docsTargetOwnerRepo && configInputs.docsTargetBranch) {
    await openPr()
  }
}

const generateTypedocMarkdown = async (): Promise<void> => {
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

  await createOrUpdatePr(
    octokit,
    targetOwner,
    targetRepo,
    targetBranch,
    targetBase
  )
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

  try {
    const branch = await octokit.rest.repos.getBranch({
      owner: targetOwner,
      repo: targetRepo,
      branch: targetBranch
    })
    const branchShortSha = branch.data.commit.sha.slice(0, 7)
    console.info(`>>> Branch ${targetBranch} exists, sha = ${branchShortSha}`)
  } catch (error) {
    if ((error as { status: number }).status !== 404) {
      throw error
    }

    console.info(`>>> Branch ${targetBranch} not found. Creating...`)

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

    // wait a bit for the branch to be created and properly propagated
    // otherwise our commit will fail
    await wait(15_000)
  }
}

const pushDocsToBranch = async (
  octokit: ReturnType<typeof github.getOctokit>,
  targetOwner: string,
  targetRepo: string,
  targetBranch: string,
  targetRepoPath: string
) => {
  const files = readdirSync(GENERATED_DOCS_DIR, {
    recursive: true,
    withFileTypes: true
  })

  const blobs = await Promise.all(
    files
      .filter(f => f.isFile())
      .map(async file => {
        console.info(`>>> Creating blob for ${file.name}...`)
        const filePath = path.join(file.path, file.name)
        const content = readFileSync(filePath)
        const blobData = await octokit.rest.git.createBlob({
          owner: targetOwner,
          repo: targetRepo,
          content: content.toString('base64'),
          encoding: 'base64'
        })

        const fileSubpath = filePath.split(GENERATED_DOCS_DIR)[1]

        return {
          path: path.join(targetRepoPath, fileSubpath),
          mode: '100644' as '100644',
          type: 'blob' as 'blob',
          sha: blobData.data.sha
        }
      })
  )

  console.info(`>>> Pushing ${blobs.length} docfiles to ${targetBranch}...`)
  console.info(`>>> Blobs:`, blobs)

  const { data: refData } = await octokit.rest.git.getRef({
    owner: targetOwner,
    repo: targetRepo,
    ref: `heads/${targetBranch}`
  })
  const commitSHA = refData.object.sha
  console.info(`>>> Target branch current commit SHA: ${commitSHA}`)

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

  if (commitData.tree.sha === treeData.sha) {
    console.info(`>>> No changes to commit, skipping...`)
    return
  }

  console.info(
    `>>> Creating new commit... `,
    commitData.tree.sha.slice(0, 7),
    ' -> ',
    treeData.sha.slice(0, 7)
  )
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

  const newCommitShortSha = newCommitData.sha.slice(0, 7)
  console.info(
    `>>> Pushed docs to ${targetBranch} with commit ${newCommitShortSha} successfully!`
  )
}

const createOrUpdatePr = async (
  octokit: ReturnType<typeof github.getOctokit>,
  targetOwner: string,
  targetRepo: string,
  targetBranch: string,
  targetBase: string
) => {
  // check if PR exists
  const { data: pulls } = await octokit.rest.pulls.list({
    owner: targetOwner,
    repo: targetRepo,
    head: `${targetOwner}:${targetBranch}`,
    base: targetBase
  })

  const title = `tbdocs: generated docs ${targetBranch}`

  const { owner, repo } = github.context.repo
  const repoUrl = `https://github.com/${owner}/${repo}`

  const body =
    `Automatic generated docs from the source code in the repository [${owner}/${repo}](${repoUrl})` +
    `\n\n` +
    `Project source path: **${configInputs.projectPath}**` +
    `\n\n` +
    `**Please do not touch this PR, it will be updated automatically by the tbdocs pipeline.
    Instead, update the docs in the source code.**`

  const footer =
    `Updated @ ${new Date().toISOString()} from ` +
    `GH-Action Execution #${github.context.runId}-${github.context.runNumber}`

  const fullBody = `${body}\n\n---\n_${footer}_`

  if (pulls.length === 0) {
    console.info(`>>> Creating PR...\nTitle: ${title}\nBody: ${fullBody}`)
    return octokit.rest.pulls.create({
      owner: targetOwner,
      repo: targetRepo,
      head: targetBranch,
      base: targetBase,
      title,
      body: fullBody
    })
  } else {
    const pr = pulls[0]
    console.info(
      `>>> Updating PR #${pr.number}...\nTitle: ${title}\nBody: ${fullBody}`
    )
    return octokit.rest.pulls.update({
      owner: targetOwner,
      repo: targetRepo,
      pull_number: pr.number,
      title,
      body: fullBody
    })
  }
}
