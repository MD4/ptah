import Title from "antd/es/typography/Title";
import * as React from "react";
import { Outlet, useParams } from "react-router-dom";
import WithHeaderLayout from "../layouts/with-header.layout";
import ProgramMenu from "../molecules/program/program-menu";

const styles: Record<string, React.CSSProperties> = {
  logo: {
    width: 144,
  },
};

function PtahLogo() {
  return <img alt="PTAH logo" src="/ptah-logo-white.svg" style={styles.logo} />;
}

function ProgramTitle() {
  const { programName } = useParams();

  return (
    <Title level={4} style={{ margin: 0 }}>
      {programName?.toUpperCase()}
    </Title>
  );
}

export default function ProgramPage() {
  return (
    <WithHeaderLayout
      headerCenter={<ProgramTitle />}
      headerLeft={<PtahLogo />}
      headerRight={<ProgramMenu />}
    >
      <Outlet />
    </WithHeaderLayout>
  );
}
