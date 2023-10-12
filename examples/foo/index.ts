/**
 * Just a Foo type as a doc example.
 *
 * @public
 **/
export type Foo = {
  /** Field 1 is a string */
  field1: string

  /** Field 2 is a number */
  field2: number
}

/**
 * Just a Foo function as a doc example that says hello to someone.
 *
 * @public
 **/
export const greetings = (name: string): string => {
  return `Hello ${name}`
}
