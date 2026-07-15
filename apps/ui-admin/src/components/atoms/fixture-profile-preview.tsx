import type * as models from "@ptah-app/lib-models";
import { Flex, Typography, theme } from "antd";
import * as React from "react";

const { useToken } = theme;

const ROLE_TINTS: Partial<Record<models.FixtureChannelRole, string>> = {
  red: "rgba(255, 0, 0, 0.35)",
  green: "rgba(0, 255, 0, 0.25)",
  blue: "rgba(0, 64, 255, 0.35)",
};

/** One chip per profile channel, so the DMX footprint is visible at a glance. */
export default function FixtureProfilePreview({
  profile,
}: {
  profile?: models.FixtureProfile;
}) {
  const { token } = useToken();

  const styles = React.useMemo(
    () =>
      ({
        chip: {
          padding: `${token.sizeXXS}px ${token.sizeXS}px`,
          borderRadius: token.borderRadiusSM,
          border: `1px solid ${token.colorBorderSecondary}`,
          background: token.colorFillQuaternary,
          fontSize: token.fontSizeSM,
        },
      }) satisfies Record<string, React.CSSProperties>,
    [
      token.borderRadiusSM,
      token.colorBorderSecondary,
      token.colorFillQuaternary,
      token.fontSizeSM,
      token.sizeXS,
      token.sizeXXS,
    ],
  );

  if (!profile) {
    return null;
  }

  return (
    <Flex gap="small" wrap>
      {profile.channels.map((channel) => (
        <span
          key={`${channel.role}-${channel.label}`}
          style={{
            ...styles.chip,
            ...(ROLE_TINTS[channel.role]
              ? { background: ROLE_TINTS[channel.role] }
              : {}),
          }}
        >
          <Typography.Text>{channel.label}</Typography.Text>
        </span>
      ))}
    </Flex>
  );
}
