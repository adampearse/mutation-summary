export enum Movement {
  STAYED_OUT,
  ENTERED,
  STAYED_IN,
  REPARENTED,
  REORDERED,
  EXITED
}

export namespace Movement {
  export function enteredOrExited(changeType: Movement): boolean {
    return changeType === Movement.ENTERED || changeType === Movement.EXITED;
  }
}