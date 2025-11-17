import * as domains from "@ptah-app/lib-domains";
import type * as models from "@ptah-app/lib-models";
import { env, repositories } from "@ptah-app/lib-shared";

export const handleShowList = async (): Promise<models.ShowName[]> => {
  await repositories.file.checkPathAndInitialize(env.vars.PTAH_SHOWS_PATH);

  return repositories.show.listShowFromPath(env.vars.PTAH_SHOWS_PATH);
};

export const handleShowCreate = async (name: string): Promise<models.Show> => {
  await repositories.file.checkPathAndInitialize(env.vars.PTAH_SHOWS_PATH);

  const show = domains.show.createShow(name);

  await repositories.show.saveShowToPath(
    show,
    `${env.vars.PTAH_SHOWS_PATH}/${name}.json`,
  );

  return show;
};

export const handleShowSave = async (
  name: models.ShowName,
  show: models.Show,
): Promise<models.Show> => {
  await repositories.file.checkPathAndInitialize(env.vars.PTAH_SHOWS_PATH);

  await repositories.show.saveShowToPath(
    show,
    `${env.vars.PTAH_SHOWS_PATH}/${name}.json`,
  );

  return show;
};

export const handleShowGet = async (name: string): Promise<models.Show> => {
  await repositories.file.checkPathAndInitialize(env.vars.PTAH_SHOWS_PATH);

  return repositories.show.loadShowFromPath(
    `${env.vars.PTAH_SHOWS_PATH}/${name}.json`,
  );
};

export const handleShowDelete = async (
  name: models.ShowName,
): Promise<void> => {
  await repositories.file.checkPathAndInitialize(env.vars.PTAH_SHOWS_PATH);

  return repositories.show.deleteShowFromPath(
    `${env.vars.PTAH_SHOWS_PATH}/${name}.json`,
  );
};
