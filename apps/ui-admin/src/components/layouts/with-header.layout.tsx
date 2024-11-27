import * as React from "react";
import { useMediaQuery } from "usehooks-ts";

import { Flex, Layout, theme } from "antd";

const { useToken } = theme;

export default function ShowLayout({
  children,
  headerLeft,
  headerCenter,
  headerRight,
}: {
  children: JSX.Element;
  headerLeft: JSX.Element;
  headerCenter: JSX.Element;
  headerRight: JSX.Element;
}): JSX.Element {
  const { token } = useToken();
  const mobile = useMediaQuery("(max-width: 768px)");

  const styles: Record<string, React.CSSProperties> = React.useMemo(
    () => ({
      showLayout: {
        width: "100%",
        height: "100%",
        background: "transparent",
        display: "flex",
      },
      header: {
        position: "absolute",
        padding: token.paddingLG,
        width: "100%",
        zIndex: 1,
        backdropFilter: "blur(8px)",
        borderBottomColor: token.colorBgContainer,
        borderBottomStyle: "solid",
        borderBottomWidth: 1,
      },
      headerLeft: { flex: 1, display: "flex", justifyContent: "flex-start" },
      headerCenter: {
        flex: 1,
        display: "flex",
        justifyContent: "flex-end",
      },
      headerRight: {
        flex: mobile ? "auto" : 1,
        display: "flex",
        justifyContent: mobile ? "left" : "center",
      },
      content: {
        flex: 1,
      },
    }),
    [token.paddingLG, token.colorBgContainer, mobile],
  );

  return (
    <Layout style={styles.showLayout}>
      <Flex align="center" style={styles.header}>
        {mobile ? null : <div style={styles.headerLeft}>{headerLeft}</div>}
        <div style={styles.headerRight}>{headerCenter}</div>
        <div style={styles.headerCenter}>{headerRight}</div>
      </Flex>
      <main style={styles.content}>{children}</main>
    </Layout>
  );
}
