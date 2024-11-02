import * as React from "react";
import type { NodeProps } from "reactflow";

import { PlusOutlined } from "@ant-design/icons";
import { Button, Flex, theme } from "antd";

const { useToken } = theme;

export type NodeAddProgramData = {
  onAddProgram: () => void;
};

export default function NodeAddProgram({
  data: { onAddProgram = () => undefined },
}: NodeProps<NodeAddProgramData>): JSX.Element {
  const { token } = useToken();

  const styles: Record<string, React.CSSProperties> = React.useMemo(
    () => ({
      container: {
        padding: token.sizeMS,
        borderRadius: token.borderRadiusLG,
        borderStyle: "dashed",
        borderWidth: 3,
        borderColor: token.colorFillQuaternary,
        height: 96,
        width: 240,
      },
    }),
    [token.borderRadiusLG, token.colorFillQuaternary, token.sizeMS],
  );

  return (
    <Flex align="center" gap="small" justify="center" style={styles.container}>
      <Button icon={<PlusOutlined />} onClick={onAddProgram} type="primary">
        Add program
      </Button>
    </Flex>
  );
}
