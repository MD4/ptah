export const sleep = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });

export const isDefined = <T>(item: T | undefined): item is T => {
  return Boolean(item);
};
