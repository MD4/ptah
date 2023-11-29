import { theme } from "antd";
import * as React from "react";

const { useToken } = theme;

export type NodeStyleType = "default" | "input" | "output";

export const useDefaultNodeStyle = (
  type: NodeStyleType = "default"
): Record<string, React.CSSProperties> => {
  const { token } = useToken();

  return React.useMemo(
    () => ({
      container: {
        border: "none",
        padding: 16,

        borderTopLeftRadius:
          type === "output" ? token.borderRadiusLG * 2 : token.borderRadiusLG,
        borderTopRightRadius:
          type === "input" ? token.borderRadiusLG * 2 : token.borderRadiusLG,
        borderBottomLeftRadius:
          type === "output" ? token.borderRadiusLG * 2 : token.borderRadiusLG,
        borderBottomRightRadius:
          type === "input" ? token.borderRadiusLG * 2 : token.borderRadiusLG,

        background: token.colorBgElevated,
        width: "160px",
      },
      handle: {
        borderRadius: 16,
        width: 8,
        height: 8,
        background: token.colorTextDescription,
      },
      label: {
        width: "100%",
        color: token.colorTextTertiary,
      },
    }),
    [
      token.borderRadiusLG,
      token.colorBgElevated,
      token.colorTextDescription,
      token.colorTextTertiary,
      type,
    ]
  );
};
