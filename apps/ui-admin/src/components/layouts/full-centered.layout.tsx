import type * as React from "react";

import { Flex } from "antd";

const styles: Record<string, React.CSSProperties> = {
  fullCenteredLayout: {
    animation: "ease-out animationEnterLeftToRight 150ms",
    position: "absolute",
    left: "0px",
    top: "0px",
    width: "100%",
    height: "100%",
    zIndex: 0,
  },
};

export default function FullCenteredLayout({
  children,
}: {
  children: JSX.Element | JSX.Element[];
}): JSX.Element {
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
