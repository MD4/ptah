import Title from "antd/es/typography/Title";
import * as React from "react";
import { Link, useNavigate } from "react-router-dom";

import { CaretLeftOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Flex, theme } from "antd";

import { useProgramList } from "../../../repositories/program.repository";
import FullCenteredLayout from "../../layouts/full-centered.layout";
import PtahError from "../../molecules/ptah-error";
import SearchableList from "../../molecules/searchable-list/searchable-list";

const { useToken } = theme;

export default function ProgramListPage(): JSX.Element {
  const navigate = useNavigate();
  const { token } = useToken();
  const { isPending, error, data } = useProgramList();

  const onProgramSelected = React.useCallback(
    (programName: string) => {
      navigate(`/program/${programName}`);
    },
    [navigate],
  );

  const styles: Record<string, React.CSSProperties> = React.useMemo(
    () => ({
      container: {
        width: 400,
        height: 500,
        maxWidth: "90vw",
        maxHeight: 500,
      },
    }),
    [],
  );

  if (error) {
    return <PtahError error={error} />;
  }

  return (
    <FullCenteredLayout>
      <Flex style={styles.container} vertical>
        <Flex justify="center">
          <Title style={{ color: token.colorPrimary }}>PROGRAMS</Title>
        </Flex>

        <SearchableList
          data={data}
          footer={
            <Flex gap="large" justify="space-between">
              <Link to="/">
                <Button type="text">
                  <CaretLeftOutlined />
                  <span>Back</span>
                </Button>
              </Link>
              <Link to="/program/create">
                <Button type="primary">
                  <span>Create new program</span>
                  <PlusOutlined />
                </Button>
              </Link>
            </Flex>
          }
          isLoading={isPending}
          onItemSelected={onProgramSelected}
          placeholder="Search program"
        />
      </Flex>
    </FullCenteredLayout>
  );
}
