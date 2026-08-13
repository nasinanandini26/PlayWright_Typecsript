/**
 * A tiny in-memory cart used only by this exercise (no browser involved) —
 * already fully implemented. Use it from CartSteps.ts; don't edit this file.
 */
export class ShoppingCart {
  private readonly items: Set<string> = new Set();

  public add(item: string): void {
    this.items.add(item);
  }

  public remove(item: string): void {
    this.items.delete(item);
  }

  public size(): number {
    return this.items.size;
  }

  public contains(item: string): boolean {
    return this.items.has(item);
  }
}
