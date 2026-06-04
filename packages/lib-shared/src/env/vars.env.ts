import os from "node:os";

export const PTAH_DIRECTORY = `${os.homedir()}/.ptah`;

export const PTAH_SETTINGS_FILENAME = ".ptah-settings.json";

export const PTAH_SETTINGS_PATH = `${PTAH_DIRECTORY}/${PTAH_SETTINGS_FILENAME}`;
export const PTAH_SHOWS_PATH = `${PTAH_DIRECTORY}/shows`;
export const PTAH_PROGRAMS_PATH = `${PTAH_DIRECTORY}/programs`;

export const PTAH_BACKUPS_PATH = `${PTAH_DIRECTORY}/.backups`;
export const PTAH_SHOWS_BACKUPS_PATH = `${PTAH_BACKUPS_PATH}/shows`;
export const PTAH_PROGRAMS_BACKUPS_PATH = `${PTAH_BACKUPS_PATH}/programs`;
export const PTAH_SETTINGS_BACKUPS_PATH = `${PTAH_BACKUPS_PATH}/settings`;
