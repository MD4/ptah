import type * as models from "@ptah/lib-models";
import { Modal } from "antd";
import * as React from "react";

import {
  useProgramGet,
  useProgramList,
} from "../../../repositories/program.repository";
import PtahError from "../../molecules/ptah-error";
import SearchableList from "../../molecules/searchable-list/searchable-list";

export default function ShowAddProgramModal({
  open,
  onCancel,
  onProgramSelected,
}: {
  open: boolean;
  onCancel: () => void;
  onProgramSelected: (program: models.Program) => void;
}) {
  const { isPending, data, error } = useProgramList();
  const [programSelected, setProgramSelected] = React.useState<
    string | undefined
  >();

  const program = useProgramGet(programSelected);

  React.useEffect(() => {
    if (!program.isLoading && !program.isError && program.data) {
      onProgramSelected(program.data);
      setProgramSelected(undefined);
    }
  }, [onProgramSelected, program.data, program.isError, program.isLoading]);

  if (error) {
    return <PtahError error={error} />;
  }

  if (program.error) {
    return <PtahError error={program.error} />;
  }

  return (
    <Modal footer={[]} onCancel={onCancel} open={open} title="ADD PROGRAM">
      <SearchableList
        data={data}
        isLoading={isPending || program.isLoading}
        onItemSelected={setProgramSelected}
      />
    </Modal>
  );
}
