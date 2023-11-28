export const log = (context = "", ...args: unknown[]): void => {
  // eslint-disable-next-line no-console -- logger
  console.log(`\x1b[35m[ptah:${context}]\x1b[0m`, ...args);
};

export const logError = (context = "", ...args: unknown[]): void => {
  // eslint-disable-next-line no-console -- logger
  console.error(`\x1b[35m[ptah:${context}]\x1b[0m`, ...args);
};
