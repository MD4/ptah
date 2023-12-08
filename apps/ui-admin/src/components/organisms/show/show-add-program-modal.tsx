import { Modal } from "antd";
import * as React from "react";
import type * as models from "@ptah/lib-models";
import {
  useProgramGet,
  useProgramList,
} from "../../../repositories/program.repository";
import SearchableList from "../../molecules/searchable-list/searchable-list";
import PtahError from "../../molecules/ptah-error";

export default function ShowAddProgramModal({
  open,
  onCancel,
  onProgramSelected,
}: {
  open: boolean;
  onCancel: () => void;
  onProgramSelected: (program: models.Program) => void;
}): JSX.Element {
  const { isPending, data, error } = useProgramList();
  const [programSelected, setProgramSelected] = React.useState<
    string | undefined
  >();

  const program = useProgramGet(programSelected);

  React.useEffect(() => {
    if (!program.isLoading && !program.isError && program.data) {
      onProgramSelected(program.data);
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
