import { CaretLeftOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Flex, theme } from "antd";
import Title from "antd/es/typography/Title";
import * as React from "react";
import { Link, useNavigate } from "react-router-dom";

import { useShowList } from "../../../repositories/show.repository";
import FullCenteredLayout from "../../layouts/full-centered.layout";
import PtahError from "../../molecules/ptah-error";
import SearchableList from "../../molecules/searchable-list/searchable-list";

const { useToken } = theme;

export default function ShowListPage() {
  const navigate = useNavigate();
  const { token } = useToken();
  const { isPending, error, data } = useShowList();

  const onShowSelected = React.useCallback(
    (showName: string) => {
      navigate(`/show/${showName}`);
    },
    [navigate],
  );

  const styles: Record<string, React.CSSProperties> = React.useMemo(
    () => ({
      container: {
        width: 400,
        height: 400,
        minHeight: 500,
        maxHeight: 500,
        maxWidth: "90vw",
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
          <Title style={{ color: token.colorPrimary }}>SHOWS</Title>
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
              <Link to="/show/create">
                <Button type="primary">
                  <span>Create new show</span>
                  <PlusOutlined />
                </Button>
              </Link>
            </Flex>
          }
          isLoading={isPending}
          onItemSelected={onShowSelected}
          placeholder="Search show"
        />
      </Flex>
    </FullCenteredLayout>
  );
}
