// eslint-disable-next-line @typescript-eslint/no-explicit-any -- let it be
export const debounce = <F extends (this: T, ...args: any[]) => R, T, R>(
  fn: F,
  wait = 100,
  immediate = false,
): ((this: T, ...args: Parameters<F>) => void) => {
  let timeout: NodeJS.Timeout | undefined;

  return function _(this: T, ...args) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias -- just let it be
    const context = this;

    const later = function (): void {
      timeout = undefined;
      if (!immediate) fn.apply(context, args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) fn.apply(context, args);
  };
};
