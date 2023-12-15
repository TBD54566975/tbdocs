/**
 * The name of the tool used to parse the code docs
 * and generate markdown files.
 *
 * **Supported generators:**
 * - Typescript: `typedoc-markdown`
 *
 * **Future to-do work:**
 * - Kotlin: dokka
 * - etc...
 *
 * @public
 **/
export type DocsGeneratorType = 'typedoc-markdown' | 'typedoc-html'
