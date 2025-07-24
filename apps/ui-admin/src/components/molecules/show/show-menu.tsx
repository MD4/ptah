import {
  CloseOutlined,
  DashboardOutlined,
  DeleteOutlined,
  LoginOutlined,
  LogoutOutlined,
  MenuOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import { Button, Dropdown, notification } from "antd";
import * as React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useSystemApi } from "../../../domain/system.domain";
import { useShowPrograms } from "../../../repositories/program.repository";
import {
  useShowDelete,
  useShowGet,
} from "../../../repositories/show.repository";

export default function ShowMenu() {
  const system = useSystemApi();
  const navigate = useNavigate();
  const { showName } = useParams();
  const [{ error }, contextHolder] = notification.useNotification({
    placement: "bottomRight",
  });

  const showPath = React.useMemo(() => `/show/${showName ?? ""}`, [showName]);

  const show = useShowGet(showName);
  const programs = useShowPrograms(show.data?.programs ?? {});

  const onShowDeleteSuccess = React.useCallback(() => {
    system.unloadShow();
    navigate("/");
  }, [system, navigate]);

  const onShowDeleteError = React.useCallback(
    ({ message }: Error) => {
      error({
        message: "Something went wrong",
        description: message,
      });
    },
    [error],
  );

  const showDelete = useShowDelete(onShowDeleteSuccess, onShowDeleteError);

  const onReloadClick = React.useCallback(() => {
    if (showName) {
      system.loadShow(showName);
      programs.refetch();
      void show.refetch();
    }
  }, [programs, show, showName, system]);

  const onDeleteClick = React.useCallback(() => {
    if (showName) {
      showDelete.mutate(showName);
    }
  }, [showName, showDelete]);

  const items: MenuProps["items"] = [
    {
      label: <Link to={showPath}>Dashboard</Link>,
      icon: <DashboardOutlined />,
      key: "0",
    },
    {
      label: <Link to={`${showPath}/mapping`}>Mapping</Link>,
      icon: <LoginOutlined />,
      key: "1",
    },
    {
      label: <Link to={`${showPath}/patch`}>Patch</Link>,
      icon: <LogoutOutlined />,
      key: "2",
    },
    {
      type: "divider",
    },
    {
      label: (
        <Link to="#" onClick={onReloadClick}>
          Reload
        </Link>
      ),
      icon: <ReloadOutlined />,
      key: "3",
    },
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
      label: <Link to="/">Close</Link>,
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
