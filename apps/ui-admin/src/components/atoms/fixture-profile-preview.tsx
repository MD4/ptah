import type * as models from "@ptah-app/lib-models";
import { Flex, Typography, theme } from "antd";
import * as React from "react";

const { useToken } = theme;

// Literal swatch colors: they denote the DMX channel's color role, not theme.
const ROLE_DOTS: Partial<Record<models.FixtureChannelRole, string>> = {
  red: "#e84749",
  green: "#6abe39",
  blue: "#3c89e8",
  white: "#ffffff",
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
          display: "inline-flex",
          alignItems: "center",
          gap: token.sizeXXS + 2,
          padding: `${token.sizeXXS}px ${token.sizeXS}px`,
          borderRadius: token.borderRadiusSM,
          border: `1px solid ${token.colorBorderSecondary}`,
          background: token.colorFillQuaternary,
        },
        dot: {
          display: "inline-block",
          width: token.sizeXS,
          height: token.sizeXS,
          borderRadius: token.sizeXS,
          border: `1px solid ${token.colorBorderSecondary}`,
        },
        label: {
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
        <span key={`${channel.role}-${channel.label}`} style={styles.chip}>
          {ROLE_DOTS[channel.role] ? (
            <span
              style={{
                ...styles.dot,
                background: ROLE_DOTS[channel.role],
              }}
            />
          ) : null}
          <Typography.Text style={styles.label}>
            {channel.label}
          </Typography.Text>
        </span>
      ))}
    </Flex>
  );
}
