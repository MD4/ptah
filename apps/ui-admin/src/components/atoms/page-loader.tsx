import * as React from "react";

import { Flex, Spin } from "antd";

export default function PageLoader(): JSX.Element {
  const styles: Record<string, React.CSSProperties> = React.useMemo(
    () => ({
      container: {
        position: "absolute",
        left: "0px",
        top: "0px",
        width: "100%",
        height: "100%",
        zIndex: "0",
      },
    }),
    [],
  );

  return (
    <Flex align="center" justify="center" style={styles.container}>
      <Spin />
    </Flex>
  );
}
