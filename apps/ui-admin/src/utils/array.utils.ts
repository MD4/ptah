export const deduplicate = <T>(array: T[]): T[] => Array.from(new Set(array));
