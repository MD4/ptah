import { Flex } from "antd";
import * as React from "react";

const styles = {
  fullCenteredLayout: {
    animation: "ease-out animationEnterLeftToRight 150ms",
    position: "absolute",
    left: "0px",
    top: "0px",
    width: "100%",
    height: "100%",
    zIndex: 0,
  },
} satisfies Record<string, React.CSSProperties>;

export default function FullCenteredLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Flex
      align="center"
      gap="middle"
      justify="center"
      style={styles.fullCenteredLayout}
      vertical
    >
      {children}
    </Flex>
  );
}
