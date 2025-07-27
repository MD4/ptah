import { theme } from "antd";
import * as React from "react";

const { useToken } = theme;

export type NodeStyleType = "default" | "input" | "output";

export const useDefaultNodeStyle = (
  type: NodeStyleType = "default",
  selected = false,
) => {
  const { token } = useToken();

  return React.useMemo(
    () =>
      ({
        container: {
          border: "none",
          padding: token.sizeSM,

          borderTopLeftRadius:
            type === "output" ? token.borderRadiusLG * 2 : token.borderRadiusLG,
          borderTopRightRadius:
            type === "input" ? token.borderRadiusLG * 2 : token.borderRadiusLG,
          borderBottomLeftRadius:
            type === "output" ? token.borderRadiusLG * 2 : token.borderRadiusLG,
          borderBottomRightRadius:
            type === "input" ? token.borderRadiusLG * 2 : token.borderRadiusLG,

          borderStyle: "solid",
          borderColor: selected ? token.colorPrimary : "transparent",
          borderWidth: token.lineWidth,

          background: token.colorBgElevated,
          width: "auto",
          minWidth: 120,
        },
        handle: {
          borderRadius: token.sizeXS,
          width: token.sizeXS,
          height: token.sizeXS,
          background: token.colorTextDescription,
          outlineColor: token.colorBgContainer,
          outlineWidth: token.sizeXXS,
          outlineStyle: "solid",
        },
        label: {
          width: "100%",
          color: token.colorTextTertiary,
        },
      }) satisfies Record<string, React.CSSProperties>,
    [
      selected,
      token.borderRadiusLG,
      token.colorBgContainer,
      token.colorBgElevated,
      token.colorPrimary,
      token.colorTextDescription,
      token.colorTextTertiary,
      token.lineWidth,
      token.sizeSM,
      token.sizeXS,
      token.sizeXXS,
      type,
    ],
  );
};
