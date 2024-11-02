import Title from "antd/es/typography/Title";
import * as React from "react";
import { Outlet, useParams } from "react-router-dom";

import { useSystem } from "../../domain/system.domain";
import WithHeaderLayout from "../layouts/with-header.layout";
import ShowMenu from "../molecules/show/show-menu";

const styles: Record<string, React.CSSProperties> = {
  logo: {
    width: 144,
  },
};

function PtahLogo(): JSX.Element {
  return <img alt="PTAH logo" src="/ptah-logo-white.svg" style={styles.logo} />;
}

function ShowTitle(): JSX.Element {
  const { showName } = useParams();

  return (
    <Title level={3} style={{ margin: 0 }}>
      {showName?.toUpperCase()}
    </Title>
  );
}

export default function ShowPage(): JSX.Element {
  const { showName } = useParams();
  const system = useSystem();

  React.useEffect(() => {
    if (showName && system.state.connected) {
      system.api.loadShow(showName);
    }
  }, [showName, system.api, system.state.connected]);

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
