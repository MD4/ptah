import { CaretLeftOutlined, SaveFilled } from "@ant-design/icons";
import type { Settings } from "@ptah-app/lib-models";
import {
  Button,
  Col,
  Divider,
  Input,
  InputNumber,
  notification,
  Row,
  Tag,
  Typography,
  theme,
} from "antd";
import * as React from "react";
import { Link } from "react-router-dom";
import { useSettingsPut } from "../../../repositories/settings.repository";

const { useToken } = theme;

export default function SettingsMainPage({
  settings: baseSettings,
}: {
  settings: Settings;
}) {
  const { token } = useToken();
  const styles = React.useMemo(
    () =>
      ({
        textVersion: {
          color: token.colorTextTertiary,
        },
        settingsLine: {
          display: "flex",
          justifyContent: "flex-end",
        },
        inputMidiVirtualPortName: {
          width: 120,
          borderWidth: 2,
          borderColor: token.colorBgBlur,
        },
        inputMidiChannel: {
          width: 50,
          borderWidth: 2,
          borderColor: token.colorBgBlur,
        },
        inputAppAdminPort: {
          width: 80,
          borderWidth: 2,
          borderColor: token.colorBgBlur,
        },
      }) satisfies Record<string, React.CSSProperties>,
    [token.colorTextTertiary, token.colorBgBlur],
  );

  const [settings, setSettings] = React.useState<Settings>({ ...baseSettings });

  const [{ error, success }, contextHolder] = notification.useNotification({
    placement: "bottomRight",
  });

  const onSaveMutationSuccess = React.useCallback(() => {
    success({ message: "All good", description: "Program successfully saved" });
  }, [success]);

  const onSaveMutationError = React.useCallback<(err: Error) => void>(
    ({ message }) => {
      error({ message: "Something went wrong", description: message });
    },
    [error],
  );

  const saveMutation = useSettingsPut(
    onSaveMutationSuccess,
    onSaveMutationError,
  );

  const onSaveClick = React.useCallback(() => {
    saveMutation.mutate(settings);
  }, [saveMutation.mutate, settings]);

  const onMidiVirtualPortNameChange = React.useCallback(
    ({ target }: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setSettings((settings) => ({
        ...settings,
        midiVirtualPortName: target.value ?? settings.midiVirtualPortName,
      })),
    [],
  );

  const onAppAdminPortChange = React.useCallback(
    (value: number | null) =>
      setSettings((settings) => ({
        ...settings,
        appAdminPort: value ?? settings.appAdminPort,
      })),
    [],
  );

  const onMidiChanellChange = React.useCallback(
    (value: number | null) =>
      setSettings((settings) => ({
        ...settings,
        midiChannel: value ?? settings.midiChannel,
      })),
    [],
  );

  return (
    <>
      <Row gutter={[16, 16]} justify="center">
        <Col span={12}>
          <Typography.Text style={styles.textVersion}>
            App version
          </Typography.Text>
        </Col>
        <Col span={12} style={styles.settingsLine}>
          <Tag>v{settings.appVersion ?? "0.0.0-dev"}</Tag>
        </Col>

        <Divider plain>MIDI</Divider>

        <Col span={12}>
          <Typography.Text style={styles.textVersion}>
            Virtual port name
          </Typography.Text>
        </Col>
        <Col span={12} style={styles.settingsLine}>
          <Input
            style={styles.inputMidiVirtualPortName}
            placeholder="ptah"
            type="text"
            value={settings.midiVirtualPortName}
            onChange={onMidiVirtualPortNameChange}
          />
        </Col>

        <Col span={12}>
          <Typography.Text style={styles.textVersion}>Channel</Typography.Text>
        </Col>
        <Col span={12} style={styles.settingsLine}>
          <InputNumber
            style={styles.inputMidiChannel}
            min={1}
            max={16}
            value={settings.midiChannel}
            onChange={onMidiChanellChange}
          />
        </Col>

        <Divider plain>APP</Divider>

        <Col span={12}>
          <Typography.Text style={styles.textVersion}>UI port</Typography.Text>
        </Col>
        <Col span={12} style={styles.settingsLine}>
          <InputNumber
            style={styles.inputAppAdminPort}
            min={1024}
            max={49151}
            value={settings.appAdminPort}
            onChange={onAppAdminPortChange}
          />
        </Col>

        <Col span={24} />

        <Col span={12}>
          <Link to="/">
            <Button type="text">
              <CaretLeftOutlined />
              <span>Back</span>
            </Button>
          </Link>
        </Col>
        <Col span={12} style={styles.settingsLine}>
          <Button type="primary" onClick={onSaveClick}>
            <span>Save settings</span>
            <SaveFilled />
          </Button>
        </Col>
      </Row>

      {contextHolder}
    </>
  );
}
