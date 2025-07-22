import Title from "antd/es/typography/Title";
import * as React from "react";
import { Outlet, useParams } from "react-router-dom";

import { useSystemApi, useSystemState } from "../../domain/system.domain";
import WithHeaderLayout from "../layouts/with-header.layout";
import ShowMenu from "../molecules/show/show-menu";

const styles: Record<string, React.CSSProperties> = {
  logo: {
    width: 144,
  },
};

function PtahLogo() {
  return <img alt="PTAH logo" src="/ptah-logo-white.svg" style={styles.logo} />;
}

function ShowTitle() {
  const { showName } = useParams();

  return (
    <Title level={3} style={{ margin: 0 }}>
      {showName?.toUpperCase()}
    </Title>
  );
}

export default function ShowPage() {
  const { showName } = useParams();
  const { connected } = useSystemState();
  const { loadShow } = useSystemApi();

  React.useEffect(() => {
    if (showName && connected) {
      loadShow(showName);
    }
  }, [connected, showName, loadShow]);

  return (
    <WithHeaderLayout
      headerCenter={<ShowTitle />}
      headerLeft={<PtahLogo />}
      headerRight={<ShowMenu />}
    >
      <Outlet />
    </WithHeaderLayout>
  );
}
