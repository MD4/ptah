export const debounce = <F extends (this: T, ...args: unknown[]) => R, T, R>(
  fn: F,
  wait = 100,
  immediate = false,
): ((this: T, ...args: Parameters<F>) => void) => {
  let timeout: NodeJS.Timeout | undefined;

  return function _(this: T, ...args) {
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
