import { Layout, theme } from "antd";
import * as React from "react";
import { Outlet } from "react-router-dom";
import SystemStatus from "../molecules/system/system-status";

const { useToken } = theme;

export default function AppLayout(): JSX.Element {
  const { token } = useToken();

  const styles: Record<string, React.CSSProperties> = React.useMemo(
    () => ({
      appLayout: {
        width: "100%",
        height: "100%",
        background: token.colorBgContainer,
      },
    }),
    [token.colorBgContainer]
  );

  return (
    <Layout className="app-layout" style={styles.appLayout}>
      <Outlet />
      <SystemStatus />
    </Layout>
  );
}
