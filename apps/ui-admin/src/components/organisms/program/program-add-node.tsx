import { CloseOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Flex, theme } from "antd";
import * as React from "react";

import ProgramNodeLibrary from "./program-node-library";

const { useToken } = theme;

export default function ProgramAddNode() {
  const [open, setOpen] = React.useState(false);
  const [_, setVisible] = React.useState(true);

  const { token } = useToken();

  const styles = React.useMemo(
    () =>
      ({
        backdrop: {
          display: "none",
          position: "absolute",
          left: 0,
          top: 0,
          height: "100%",
          width: "100%",
          zIndex: 2,
          pointerEvents: "none",
        },
        container: {
          position: "absolute",
          left: 0,
          top: 0,
          height: "100%",
          zIndex: 3,
          animation: "ease-out animationEnterRightToLeft 100ms",
          backdropFilter: "blur(8px)",
        },
        buttonContainer: {
          position: "absolute",
          left: 0,
          top: 0,
          height: "100%",
          padding: token.padding,
        },
        header: {
          width: "100%",
          padding: token.padding,
        },
        button: {
          backdropFilter: "blur(8px)",
        },
      }) satisfies Record<string, React.CSSProperties>,
    [token.padding],
  );

  const onAddNodeClick = React.useCallback(() => {
    setOpen(true);
    setVisible(true);
  }, []);

  const onClose = React.useCallback(() => {
    setOpen(false);
  }, []);

  const onDragStart = React.useCallback(() => {
    setVisible(false);
  }, []);

  return (
    <>
      <Flex align="center" style={styles.buttonContainer}>
        <Button
          icon={<PlusOutlined />}
          onClick={onAddNodeClick}
          size="large"
          style={styles.button}
          type="text"
        />
      </Flex>
      {open ? (
        <>
          <div aria-hidden="true" onClick={onClose} style={styles.backdrop} />
          <div style={styles.container}>
            <Flex justify="flex-end" style={styles.header}>
              <Button
                icon={<CloseOutlined />}
                onClick={onClose}
                size="large"
                type="text"
              />
            </Flex>
            <ProgramNodeLibrary
              onNodeDropped={onClose}
              onDragStart={onDragStart}
            />
          </div>
        </>
      ) : null}
    </>
  );
}
