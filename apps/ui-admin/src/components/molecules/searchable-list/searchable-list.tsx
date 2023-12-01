import * as React from "react";
import { Input, Button, Flex, List, theme } from "antd";
import { CaretRightOutlined, SearchOutlined } from "@ant-design/icons";

const { useToken } = theme;

export default function SearchableList({
  data,
  isLoading,
  onItemSelected,
  footer = [],
}: {
  data?: string[];
  isLoading: boolean;
  onItemSelected: (item: string) => void;
  footer?: React.ReactNode;
}): JSX.Element {
  const { token } = useToken();
  const [filteredData, setFilteredData] = React.useState<string[]>([]);

  const onSearch = React.useCallback<
    React.ChangeEventHandler<HTMLInputElement>
  >(
    (event) => {
      if (data) {
        setFilteredData(
          data.filter((programName) =>
            programName
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
      setFilteredData(data);
    }
  }, [data]);

  const styles: Record<string, React.CSSProperties> = React.useMemo(
    () => ({
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

  return (
    <Flex flex="1" gap="middle" vertical>
      <Input
        allowClear
        bordered={false}
        onChange={onSearch}
        placeholder="Search program"
        suffix={<SearchOutlined />}
      />

      <List
        bordered
        footer={footer}
        loading={isLoading}
        size="large"
        style={styles.list}
      >
        <div style={styles.listContent}>
          {data && !filteredData.length ? (
            <List.Item style={styles.empty}>No programs found.</List.Item>
          ) : null}
          {filteredData.map((item) => (
            <List.Item key={item} style={styles.listItem}>
              <Button
                onClick={() => {
                  onItemSelected(item);
                }}
                size="large"
                style={styles.listItemButton}
                type="text"
              >
                <Flex justify="space-between">
                  <div style={styles.listItemLabel}>{item}</div>
                  <CaretRightOutlined />
                </Flex>
              </Button>
            </List.Item>
          ))}
        </div>
      </List>
    </Flex>
  );
}
