import { CloseOutlined, DeleteOutlined, MenuOutlined } from "@ant-design/icons";
import type { MenuProps } from "antd";
import { Button, Dropdown, notification } from "antd";
import * as React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useProgramDelete } from "../../../repositories/program.repository";

export default function ProgramMenu() {
  const navigate = useNavigate();
  const { programName } = useParams();
  const [{ error }, contextHolder] = notification.useNotification({
    placement: "bottomRight",
  });
  const onProgramDeleteSuccess = React.useCallback(
    () => navigate("/"),
    [navigate],
  );

  const onProgramDeleteError = React.useCallback(
    ({ message }: Error) => {
      error({
        message: "Something went wrong",
        description: message,
      });
    },
    [error],
  );

  const programDelete = useProgramDelete(
    onProgramDeleteSuccess,
    onProgramDeleteError,
  );

  const onDeleteClick = React.useCallback(() => {
    if (programName) {
      programDelete.mutate(programName);
    }
  }, [programName, programDelete]);

  const items: MenuProps["items"] = [
    {
      label: (
        <Link to="#" onClick={onDeleteClick}>
          Delete
        </Link>
      ),
      icon: <DeleteOutlined />,
      key: "4",
    },
    {
      label: <Link to="/program">Close</Link>,
      icon: <CloseOutlined />,
      key: "5",
    },
  ];

  return (
    <>
      <Dropdown menu={{ items }} trigger={["click"]}>
        <Button icon={<MenuOutlined />} size="large" type="text" />
      </Dropdown>
      {contextHolder}
    </>
  );
}
