import {Summary} from "./Summary";

export interface IQueryValidator {
  validate(summary: Summary): void;

  recordPreviousState(): void;
}