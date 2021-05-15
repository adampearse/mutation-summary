function escapeQuotes(value: string): string {
  return '"' + value.replace(/"/, '\\\"') + '"';
}

export class Qualifier {
  public attrName: string;
  public attrValue: string;
  public contains: boolean;

  constructor() {
  }

  public matches(oldValue: string): boolean {
    if (oldValue === null)
      return false;

    if (this.attrValue === undefined)
      return true;

    if (!this.contains)
      return this.attrValue == oldValue;

    const tokens = oldValue.split(' ');
    for (let i = 0; i < tokens.length; i++) {
      if (this.attrValue === tokens[i])
        return true;
    }

    return false;
  }

  public toString(): string {
    if (this.attrName === 'class' && this.contains)
      return '.' + this.attrValue;

    if (this.attrName === 'id' && !this.contains)
      return '#' + this.attrValue;

    if (this.contains)
      return '[' + this.attrName + '~=' + escapeQuotes(this.attrValue) + ']';

    if ('attrValue' in this)
      return '[' + this.attrName + '=' + escapeQuotes(this.attrValue) + ']';

    //@ts-ignore
    return '[' + this.attrName + ']';
  }
}