import os from "node:os";

export const PTAH_DIRECTORY = `${os.homedir()}/.ptah`;

export const PTAH_SETTINGS_FILENAME = ".ptah-settings.json";
export const PTAH_SETTINGS_PATH = `${PTAH_DIRECTORY}/${PTAH_SETTINGS_FILENAME}`;
