import * as React from "react";
import { Link, useParams } from "react-router-dom";

import {
  CloseOutlined,
  DashboardOutlined,
  LoginOutlined,
  LogoutOutlined,
  MenuOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import { Button, Dropdown } from "antd";

import { useSystemApi } from "../../../domain/system.domain";
import { useShowPrograms } from "../../../repositories/program.repository";
import { useShowGet } from "../../../repositories/show.repository";

export default function ShowMenu(): JSX.Element {
  const { showName } = useParams();
  const system = useSystemApi();
  const show = useShowGet(showName);
  const programs = useShowPrograms(show.data?.programs ?? {});

  const showPath = `/show/${showName ?? ""}`;

  const reload = React.useCallback(() => {
    if (showName) {
      system.loadShow(showName);
      programs.refetch();
      void show.refetch();
    }
  }, [programs, show, showName, system]);

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
        <Link to="#" onClick={reload}>
          Reload
        </Link>
      ),
      icon: <ReloadOutlined />,
      key: "3",
    },
    {
      label: <Link to="/">Close</Link>,
      icon: <CloseOutlined />,
      key: "4",
    },
  ];

  return (
    <Dropdown menu={{ items }} trigger={["click"]}>
      <Button icon={<MenuOutlined />} size="large" type="text" />
    </Dropdown>
  );
}
