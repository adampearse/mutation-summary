/**
 * A simple interface representing a JavaScript object with numbers for keys.
 */
export interface INumberMap<T> {
  [key: number]: T;
}