import { Modal } from "antd";
import * as React from "react";
import { useProgramList } from "../../../repositories/program.repository";
import SearchableList from "../../molecules/searchable-list/searchable-list";
import PtahError from "../../molecules/ptah-error";

export default function ShowAddProgramModal({
  open,
  onCancel,
  onProgramSelected,
}: {
  open: boolean;
  onCancel: () => void;
  onProgramSelected: (program: string) => void;
}): JSX.Element {
  const { isPending, data, error } = useProgramList();

  if (error) {
    return <PtahError error={error} />;
  }

  return (
    <Modal footer={[]} onCancel={onCancel} open={open} title="ADD PROGRAM">
      <SearchableList
        data={data}
        isLoading={isPending}
        onItemSelected={onProgramSelected}
      />
    </Modal>
  );
}
