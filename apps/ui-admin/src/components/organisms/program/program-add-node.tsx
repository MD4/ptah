import { CloseOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Flex, theme } from "antd";
import * as React from "react";
import ProgramNodeLibrary from "./program-node-library";

const { useToken } = theme;

export default function ProgramAddNode(): JSX.Element {
  const [open, setOpen] = React.useState(false);

  const { token } = useToken();

  const styles: Record<string, React.CSSProperties> = React.useMemo(
    () => ({
      backdrop: {
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
        borderRightColor: token.colorBgContainer,
        borderRightStyle: "solid",
        borderRightWidth: 1,
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
    }),
    [token.colorBgContainer, token.padding]
  );

  const onAddNodeClick = React.useCallback(() => {
    setOpen(true);
  }, []);

  const onClose = React.useCallback(() => {
    setOpen(
        false);
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
            <ProgramNodeLibrary onNodeDropped={onClose} />
          </div>
        </>
      ) : null}
    </>
  );
}
