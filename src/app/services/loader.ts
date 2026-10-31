import { computed, signal } from "@angular/core";

// a plain signal loader rather than httpResource, which would add ~12 kB to every guest's initial bundle
export const loader = <T>(fetch: () => Promise<T>) => {
  const value = signal<T | undefined>(undefined);
  const error = signal<unknown>(undefined);
  const reload = () => {
    error.set(undefined);
    return fetch().then(
      (result) => value.set(result),
      (failure: unknown) => error.set(failure),
    );
  };
  return {
    value: value.asReadonly(),
    error: error.asReadonly(),
    hasValue: computed(() => value() !== undefined),
    set: (result: T) => value.set(result),
    reset: () => value.set(undefined),
    reload,
  };
};

export type Loader<T> = ReturnType<typeof loader<T>>;
