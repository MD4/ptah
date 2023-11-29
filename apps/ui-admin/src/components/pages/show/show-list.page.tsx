import * as React from "react";
import { Input, Button, Flex, List, theme } from "antd";
import Title from "antd/es/typography/Title";
import {
  CaretLeftOutlined,
  CaretRightOutlined,
  PlusOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { Link } from "react-router-dom";
import FullCenteredLayout from "../../layouts/full-centered.layout";
import PtahError from "../../molecules/ptah-error";
import { useShowList } from "../../../repositories/show.repository";

const { useToken } = theme;

export default function ShowListPage(): JSX.Element {
  const { token } = useToken();

  const { isPending, error, data } = useShowList();

  const [shows, setShows] = React.useState<string[]>([]);

  const onSearch = React.useCallback<
    React.ChangeEventHandler<HTMLInputElement>
  >(
    (event) => {
      if (data) {
        setShows(
          data.filter((showName) =>
            showName
              .toLowerCase()
              .includes(event.target.value.trim().toLowerCase())
          )
        );
      }
    },
    [data]
  );

  React.useEffect(() => {
    if (data) {
      setShows(data);
    }
  }, [data]);

  const styles: Record<string, React.CSSProperties> = React.useMemo(
    () => ({
      container: {
        width: "100%",
        minWidth: 400,
        maxWidth: 400,
        minHeight: 500,
        maxHeight: 500,
      },
      list: {
        overflow: "hidden",
      },
      listContent: {
        overflowY: "auto",
        minHeight: 200,
        maxHeight: 300,
      },
      listItem: {
        padding: 0,
      },
      listItemLink: {
        width: "100%",
      },
      listItemButton: {
        width: "100%",
        borderRadius: 0,
      },
      listItemLabel: {
        fontWeight: token.fontWeightStrong,
      },
      empty: {
        display: "flex",
        justifyContent: "center",
        padding: token.paddingXL,
      },
    }),
    [token.fontWeightStrong, token.paddingXL]
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

        <Flex flex="1" gap="middle" vertical>
          <Input
            allowClear
            bordered={false}
            onChange={onSearch}
            placeholder="Search show"
            suffix={<SearchOutlined />}
          />

          <List
            bordered
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
            loading={isPending}
            size="large"
            style={styles.list}
          >
            <div style={styles.listContent}>
              {!shows.length ? (
                <List.Item style={styles.empty}>No shows found.</List.Item>
              ) : null}
              {shows.map((showName) => (
                <List.Item key={showName} style={styles.listItem}>
                  <Link style={styles.listItemLink} to={`/show/${showName}`}>
                    <Button
                      size="large"
                      style={styles.listItemButton}
                      type="text"
                    >
                      <Flex justify="space-between">
                        <div style={styles.listItemLabel}>{showName}</div>
                        <CaretRightOutlined />
                      </Flex>
                    </Button>
                  </Link>
                </List.Item>
              ))}
            </div>
          </List>
        </Flex>
      </Flex>
    </FullCenteredLayout>
  );
}
