import type * as models from "@ptah/lib-models";
import { repositories, env } from "@ptah/lib-shared";
import * as domains from "@ptah/lib-domains";

const PTAH_SHOWS_PATH = `${env.vars.PTAH_DIRECTORY}/shows`;

export const handleShowList = async (): Promise<models.ShowName[]> => {
  await repositories.file.checkPathAndInitialize(PTAH_SHOWS_PATH);

  return repositories.show.listShowFromPath(PTAH_SHOWS_PATH);
};

export const handleShowCreate = async (name: string): Promise<models.Show> => {
  await repositories.file.checkPathAndInitialize(PTAH_SHOWS_PATH);

  const show = domains.show.createShow(name);

  await repositories.show.saveShowToPath(
    show,
    `${PTAH_SHOWS_PATH}/${name}.json`
  );

  return show;
};

export const handleShowSave = async (
  name: models.ShowName,
  show: models.Show
): Promise<models.Show> => {
  await repositories.file.checkPathAndInitialize(PTAH_SHOWS_PATH);

  await repositories.show.saveShowToPath(
    show,
    `${PTAH_SHOWS_PATH}/${name}.json`
  );

  return show;
};


export const handleShowGet = async (name: string): Promise<models.Show> => {
  await repositories.file.checkPathAndInitialize(PTAH_SHOWS_PATH);

  return repositories.show.loadShowFromPath(`${PTAH_SHOWS_PATH}/${name}.json`);
};
