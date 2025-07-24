import { Layout, theme } from "antd";
import * as React from "react";
import { Outlet } from "react-router-dom";

import SystemStatus from "../molecules/system/system-status";

const { useToken } = theme;

export default function AppLayout() {
  const { token } = useToken();

  const styles = React.useMemo(
    () =>
      ({
        appLayout: {
          width: "100%",
          height: "100%",
          background: token.colorBgContainer,
        },
      }) satisfies Record<string, React.CSSProperties>,
    [token.colorBgContainer],
  );

  return (
    <Layout className="app-layout" style={styles.appLayout}>
      <Outlet />
      <SystemStatus />
    </Layout>
  );
}
