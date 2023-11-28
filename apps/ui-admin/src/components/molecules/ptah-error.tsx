import { Button, Result } from "antd";
import * as React from "react";
import FullCenteredLayout from "../layouts/full-centered.layout";

export default function PtahError({ error }: { error: Error }): JSX.Element {
  const onReloadClick = (): void => {
    location.reload();
  };

  return (
    <FullCenteredLayout>
      <Result
        extra={[
          <Button key="console" onClick={onReloadClick} type="primary">
            Reload app
          </Button>,
        ]}
        status="error"
        subTitle={error.message}
        title="Something gone wrong"
      />
    </FullCenteredLayout>
  );
}
