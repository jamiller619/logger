export class Queue<T extends () => void | Promise<void>> {
  constructor(public items: T[] = []) {}

  async flush() {
    while (this.items.length > 0) {
      await this.items.shift()?.()
    }

    return this
  }

  push(...args: T[]) {
    this.items.push(...args)

    return this
  }
}
