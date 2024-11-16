export const deduplicate = <T>(
  array: T[],
  predicate: (a: T, b: T) => boolean = (a, b) => a === b,
): T[] =>
  array.reduce<T[]>(
    (memo, item) =>
      memo.some((_item) => predicate(item, _item)) ? memo : [...memo, item],
    [],
  );
