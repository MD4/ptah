import { Flex, Layout, theme } from "antd";
import * as React from "react";
import { useMediaQuery } from "usehooks-ts";

const { useToken } = theme;

export default function ShowLayout({
  children,
  headerLeft,
  headerCenter,
  headerRight,
}: {
  children: React.ReactNode;
  headerLeft: React.ReactNode;
  headerCenter: React.ReactNode;
  headerRight: React.ReactNode;
}) {
  const { token } = useToken();
  const mobile = useMediaQuery("(max-width: 768px)");

  const styles = React.useMemo(
    () =>
      ({
        showLayout: {
          width: "100%",
          height: "100%",
          background: "transparent",
          display: "flex",
        },
        header: {
          position: "absolute",
          padding: `${token.paddingSM}px ${token.paddingLG}px`,
          width: "100%",
          zIndex: 1,
          backdropFilter: "blur(8px)",
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
      }) satisfies Record<string, React.CSSProperties>,
    [token.paddingLG, token.paddingSM, mobile],
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
