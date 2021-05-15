export enum Movement {
  STAYED_OUT,
  ENTERED,
  STAYED_IN,
  REPARENTED,
  REORDERED,
  EXITED
}

function enteredOrExited(changeType:Movement):boolean {
  return changeType === Movement.ENTERED || changeType === Movement.EXITED;
}