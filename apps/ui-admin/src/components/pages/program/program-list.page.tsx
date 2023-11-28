import * as React from "react";
import { Input, Button, Flex, List, theme } from "antd";
import Title from "antd/es/typography/Title";
import {
  CaretLeftOutlined,
  CaretRightOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { Link } from "react-router-dom";
import FullCenteredLayout from "../../layouts/full-centered.layout";
import { useProgramList } from "../../../repositories/program.repository";
import PtahError from "../../molecules/ptah-error";

const { useToken } = theme;

export default function ProgramListPage(): JSX.Element {
  const { token } = useToken();

  const { isPending, error, data } = useProgramList();

  const [programs, setPrograms] = React.useState<string[]>([]);

  const onSearch = React.useCallback(
    (value: string) => {
      if (data) {
        setPrograms(
          data.filter((programName) =>
            programName.toLowerCase().includes(value.trim().toLowerCase())
          )
        );
      }
    },
    [data]
  );

  React.useEffect(() => {
    if (data) {
      setPrograms(data);
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
          <Title style={{ color: token.colorPrimary }}>PROGRAMS</Title>
        </Flex>

        <Flex flex="1" gap="middle" vertical>
          <Input.Search
            allowClear
            onSearch={onSearch}
            placeholder="Search program"
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
                <Link to="/program/create">
                  <Button type="primary">
                    <span>Create new program</span>
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
              {!programs.length ? (
                <List.Item style={styles.empty}>No programs found.</List.Item>
              ) : null}
              {programs.map((programName) => (
                <List.Item key={programName} style={styles.listItem}>
                  <Link
                    style={styles.listItemLink}
                    to={`/program/${programName}`}
                  >
                    <Button
                      size="large"
                      style={styles.listItemButton}
                      type="text"
                    >
                      <Flex justify="space-between">
                        <div style={styles.listItemLabel}>{programName}</div>
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
