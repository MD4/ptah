import { PlusOutlined } from "@ant-design/icons";
import { noop } from "@ptah-app/lib-utils";
import type { Node, NodeProps } from "@xyflow/react";
import { Button, Flex, theme } from "antd";
import * as React from "react";

const { useToken } = theme;

export type NodeAddFixtureData = {
  onAddFixture: () => void;
  firstFixture?: boolean;
};

export default function NodeAddFixture({
  data: { onAddFixture = noop, firstFixture },
}: NodeProps<Node<NodeAddFixtureData>>) {
  const { token } = useToken();

  const styles = React.useMemo(
    () =>
      ({
        container: {
          padding: token.sizeMS,
          borderRadius: token.borderRadiusLG,
          borderStyle: "dashed",
          borderWidth: 3,
          borderColor: token.colorFillQuaternary,
          height: 96,
          width: 240,
        },
      }) satisfies Record<string, React.CSSProperties>,
    [token.borderRadiusLG, token.colorFillQuaternary, token.sizeMS],
  );

  return (
    <Flex align="center" gap="small" justify="center" style={styles.container}>
      <Button icon={<PlusOutlined />} onClick={onAddFixture} type="primary">
        {firstFixture ? "Add your first fixture" : "Add fixture"}
      </Button>
    </Flex>
  );
}
