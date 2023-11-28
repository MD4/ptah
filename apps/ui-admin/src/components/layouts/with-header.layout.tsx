import { Flex, Layout, theme } from "antd";
import * as React from "react";

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
      },
      headerLeft: { flex: 1, display: "flex", justifyContent: "flex-start" },
      headerRight: { flex: 1, display: "flex", justifyContent: "center" },
      headerCenter: { flex: 1, display: "flex", justifyContent: "flex-end" },
      content: {
        flex: 1,
      },
    }),
    [token.paddingLG]
  );

  return (
    <Layout style={styles.showLayout}>
      <Flex align="center" style={styles.header}>
        <div style={styles.headerLeft}>{headerLeft}</div>
        <div style={styles.headerRight}>{headerCenter}</div>
        <div style={styles.headerCenter}>{headerRight}</div>
      </Flex>
      <main style={styles.content}>{children}</main>
    </Layout>
  );
}
