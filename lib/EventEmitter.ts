export class EventEmitter<T = void> {
  private subscribers: Set<(value: T) => void> = new Set();

  subscribe(fn: (value: T) => void): () => void {
    this.subscribers.add(fn);
    return () => this.subscribers.delete(fn);
  }

  fire(value: T) {
    for (let fn of this.subscribers) fn(value);
  }
}
