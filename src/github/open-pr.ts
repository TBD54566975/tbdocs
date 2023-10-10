import path from 'path'
import { readFileSync, readdirSync } from 'fs'
import * as github from '@actions/github'
import { Octokit } from '@octokit/rest'

import { getOctokit, wait } from '../utils'
import { configInputs } from '../config'

/**
 * Open a PR to Github with the generated docs
 */
export const openPr = async (): Promise<void> => {
  console.log('>>> Opening PR...')

  const octokit = getOctokit()
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

  const pr = await createOrUpdatePr(
    octokit,
    targetOwner,
    targetRepo,
    targetBranch,
    targetBase
  )

  console.info(`>>> PR created/updated successfully!`, pr.data.comments_url)
}

const createBranch = async (
  octokit: Octokit,
  targetOwner: string,
  targetRepo: string,
  targetBranch: string,
  targetBase: string
): Promise<void> => {
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
    console.info(`>>> Branch ${targetBranch} created successfully!`)
  }
}

const pushDocsToBranch = async (
  octokit: Octokit,
  targetOwner: string,
  targetRepo: string,
  targetBranch: string,
  targetRepoPath: string
): Promise<void> => {
  const files = readdirSync(configInputs.docsDir, {
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

        const fileSubpath = filePath.split(configInputs.docsDir)[1]

        return {
          path: path.join(targetRepoPath, fileSubpath),
          mode: '100644' as const,
          type: 'blob' as const,
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
  octokit: Octokit,
  targetOwner: string,
  targetRepo: string,
  targetBranch: string,
  targetBase: string
): Promise<{ data: { comments_url: string } }> => {
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
    `**Please use this PR for previewing and reviewing purposes only.\n` +
    `DO NOT TOUCH this PR, since it will be updated automatically by the tbdocs pipeline.\n` +
    `Instead, update the docs in the source code.**`

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
