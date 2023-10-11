import path from 'path'

// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports, import/no-commonjs
const tsconfig = require('tsconfck')

interface TSConfckParseResult {
  tsconfigFile: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tsconfig: any
}

export const loadTsconfigProps = async (
  projectPath: string
): Promise<TSConfckParseResult> => {
  const tsc: TSConfckParseResult = await tsconfig.parse(
    path.join(projectPath, 'tsconfig.json')
  )

  if (!tsc?.tsconfigFile) {
    throw new Error('Could not resolve tsconfig.json')
  }

  console.info('>>> loaded tsconfig file', tsc.tsconfigFile)

  const tsConfig = tsc.tsconfig
  if (
    !tsConfig.compilerOptions ||
    !tsConfig.compilerOptions.declaration ||
    !tsConfig.compilerOptions.declarationMap
  ) {
    throw new Error(
      'tsconfig.json must have declaration and declarationMap set to true'
    )
  }

  return tsc
}
