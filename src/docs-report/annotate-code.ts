import { AnnotationProperties, error, warning, notice } from '@actions/core'

import { ReportMessage } from '.'

type AnnotationFunction = (
  message: string | Error,
  properties?: AnnotationProperties
) => void

export const annotateCode = (messages: ReportMessage[]): void => {
  for (const message of messages) {
    const annotateFn = getAnnotationFn(message.level)

    annotateFn(message.text, {
      title: `${message.category}: ${message.messageId}`,
      file: message.sourceFilePath,
      startLine: message.sourceFileLine,
      startColumn: message.sourceFileColumn
    })
  }
}

const getAnnotationFn = (level: string): AnnotationFunction => {
  switch (level) {
    case 'error':
      return error
    case 'warning':
      return warning
    default:
      return notice
  }
}
