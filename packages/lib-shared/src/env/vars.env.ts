import os from "node:os";

export const PTAH_DIRECTORY = `${os.homedir()}/.ptah`;

export const PTAH_SETTINGS_FILENAME = ".ptah-settings.json";

export const PTAH_SETTINGS_PATH = `${PTAH_DIRECTORY}/${PTAH_SETTINGS_FILENAME}`;
export const PTAH_SHOWS_PATH = `${PTAH_DIRECTORY}/shows`;
export const PTAH_PROGRAMS_PATH = `${PTAH_DIRECTORY}/programs`;
