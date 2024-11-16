export const isDefined = <T>(item: T | undefined): item is T => {
  return Boolean(item);
};
