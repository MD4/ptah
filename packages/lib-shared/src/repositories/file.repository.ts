import fs from "node:fs/promises";

export const checkIfFileExists = async (path: string): Promise<boolean> =>
  fs
    .open(path)
    .then((file) => file.close())
    .then(() => true)
    .catch(() => false);

export const checkIfDirectoryExists = async (path: string): Promise<boolean> =>
  fs
    .opendir(path)
    .then((directory) => directory.close())
    .then(() => true)
    .catch(() => false);

export const createDirectory = async (
  path: string
): Promise<string | undefined> => fs.mkdir(path, { recursive: true });

export const checkPathAndInitialize = async (path: string): Promise<void> => {
  if (!(await checkIfDirectoryExists(path))) {
    await createDirectory(path);
  }
};

export const listFilesFromPath = async (
  path: string,
  extensions: string[]
): Promise<string[]> => {
  const files = await fs.readdir(path);

  return files
    .filter((file) =>
      extensions.some((extension) => file.endsWith(`.${extension}`))
    )
    .map((file) =>
      extensions.reduce(
        (finalFile, extension) => finalFile.replace(`.${extension}`, ""),
        file
      )
    );
};
