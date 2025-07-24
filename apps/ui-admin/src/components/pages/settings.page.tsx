import { Flex, theme } from "antd";
import Title from "antd/es/typography/Title";
import * as React from "react";

import { useSettingsGet } from "../../repositories/settings.repository";
import FullCenteredLayout from "../layouts/full-centered.layout";
import PtahError from "../molecules/ptah-error";
import SettingsEdit from "../organisms/settings/settings-edit";

const { useToken } = theme;

export default function SettingsPage() {
  const { token } = useToken();
  const { error, data } = useSettingsGet();

  const styles = React.useMemo(
    () =>
      ({
        container: {
          width: 400,
          height: 400,
          minHeight: 500,
          maxHeight: 500,
          maxWidth: "90vw",
        },
      }) satisfies Record<string, React.CSSProperties>,
    [],
  );

  if (error) {
    return <PtahError error={error} />;
  }

  return (
    <FullCenteredLayout>
      <Flex style={styles.container} vertical>
        <Flex justify="center">
          <Title style={{ color: token.colorPrimary }}>SETTINGS</Title>
        </Flex>

        {data ? (
          <SettingsEdit settings={data} />
        ) : (
          <Flex justify="center">Loading...</Flex>
        )}
      </Flex>
    </FullCenteredLayout>
  );
}
