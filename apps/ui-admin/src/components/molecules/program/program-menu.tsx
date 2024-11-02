import * as React from "react";
import { Link } from "react-router-dom";

import { CloseOutlined, MenuOutlined } from "@ant-design/icons";
import type { MenuProps } from "antd";
import { Button, Dropdown } from "antd";

export default function ProgramMenu(): JSX.Element {
  const items: MenuProps["items"] = [
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
