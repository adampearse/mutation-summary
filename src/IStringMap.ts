/**
 * A simple interface representing a JavaScript object with strings for keys.
 */
export interface IStringMap<T> {
  [key: string]: T;
}