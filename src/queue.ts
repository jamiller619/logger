export class Queue<T extends () => void | Promise<void>> {
  constructor(public items: T[] = []) {}

  async flush() {
    while (this.items.length > 0) {
      await this.items.shift()?.()
    }
  }

  push(...args: T[]) {
    return this.items.push(...args)
  }
}
