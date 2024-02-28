import {
  CloseOutlined,
  DashboardOutlined,
  LoginOutlined,
  LogoutOutlined,
  MenuOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import { Button, Dropdown } from "antd";
import * as React from "react";
import { Link, useParams } from "react-router-dom";

export default function ShowMenu(): JSX.Element {
  const { showName } = useParams();

  const showPath = `/show/${showName}`;

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
      label: <Link to="/">Close</Link>,
      icon: <CloseOutlined />,
      key: "3",
    },
  ];

  return (
    <Dropdown menu={{ items }} trigger={["click"]}>
      <Button icon={<MenuOutlined />} size="large" type="text" />
    </Dropdown>
  );
}
