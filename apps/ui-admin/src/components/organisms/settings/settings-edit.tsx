import type { Settings } from "@ptah/lib-models";
import { Col, Divider, Row, Typography, theme } from "antd";
import * as React from "react";

const { useToken } = theme;

export default function SettingsMainPage({ settings }: { settings: Settings }) {
  const { token } = useToken();
  const styles: Record<string, React.CSSProperties> = React.useMemo(
    () => ({
      textVersion: {
        color: token.colorTextTertiary,
      },
      settingsLine: {
        display: "flex",
        alignItems: "center",
        minHeight: 32,
      },
    }),
    [token.colorTextTertiary],
  );

  return (
    <Row gutter={[16, 16]} justify="center">
      <Col span={12}>
        <Typography.Text style={styles.textVersion}>Version</Typography.Text>
      </Col>
      <Col span={12}>
        <Typography.Text>v{settings.version}</Typography.Text>
      </Col>

      <Divider plain>MIDI</Divider>

      <Col span={12}>
        <Typography.Text style={styles.textVersion}>
          Virtual port name
        </Typography.Text>
      </Col>
      <Col span={12} style={styles.settingsLine}>
        <Typography.Text editable>
          {settings.midiVirtualPortName}
        </Typography.Text>
      </Col>
    </Row>
  );
}
