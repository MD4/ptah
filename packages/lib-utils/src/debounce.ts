// biome-ignore lint/suspicious/noExplicitAny: This is a workaround for a limitation in the type system
export const debounce = <F extends (this: T, ...args: any) => R, T, R>(
  fn: F,
  wait = 100,
  immediate = false,
): ((this: T, ...args: Parameters<F>) => void) => {
  let timeout: NodeJS.Timeout | undefined;

  return function _(this: T, ...args: Parameters<F>) {
    const later = (): void => {
      timeout = undefined;
      if (!immediate) fn.apply(this, args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) fn.apply(this, args);
  };
};
