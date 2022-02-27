class NOTHING {}
const nothing = new NOTHING();

export interface Suspendable<T> extends PromiseLike<T> {
  getOrSuspend(): T;
}

class Deferred<T> implements Suspendable<T> {
  promise: Promise<T>;
  error: Error | null;
  _value: T | NOTHING;
  _resolve: (value: T) => void;
  _reject: (err: Error) => void;

  constructor() {
    this._resolve = null as any;
    this._reject = null as any;
    this._value = nothing;
    this.error = null;
    this.promise = new Promise((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
    }) as Promise<T>;
  }

  resolve = (value: T) => {
    if (this.isCompleted) throw new Error("promise already completed");
    this._value = value;
    this._resolve(value);
  };

  reject = (error: Error) => {
    if (this.isCompleted) throw new Error("promise already completed");
    this.error = error;
    this._reject(error);
  };

  get isResolved() {
    return this._value !== nothing;
  }

  get isRejected() {
    return this.error !== null;
  }

  get isCompleted() {
    return this.isResolved || this.isRejected;
  }

  get value() {
    if (this.isResolved) return this._value as T;
    if (this.isRejected) throw this.error;
    throw new Error("value is not yet available");
  }

  then<TResult1 = T, TResult2 = never>(
    onfulfilled?:
      | ((value: T) => TResult1 | PromiseLike<TResult1>)
      | undefined
      | null,
    onrejected?:
      | ((reason: any) => TResult2 | PromiseLike<TResult2>)
      | undefined
      | null,
  ): Deferred<TResult1 | TResult2> {
    return Deferred.ofPromise(this.promise.then(onfulfilled, onrejected));
  }

  getOrSuspend(): T {
    if (this.isResolved) return this._value as T;
    if (this.isRejected) throw this.error;
    throw this.promise;
  }

  static ofPromise<T>(promise: T | PromiseLike<T>) {
    let deferred = new Deferred<T>();
    Promise.resolve(promise).then(deferred.resolve, deferred.reject);
    return deferred;
  }
}

export type { Deferred };

export function isDeferred<T>(
  value: Deferred<T> | unknown,
): value is Deferred<T> {
  return value instanceof Deferred;
}

export function deferred<T>(): Deferred<T> {
  return new Deferred<T>();
}

export function suspendable<T>(
  f: () => T | PromiseLike<T>,
): () => Suspendable<T> {
  let deferred: Deferred<T> | null = null;
  return () => {
    if (deferred == null) {
      deferred = Deferred.ofPromise(f());
    }
    return deferred;
  };
}
