import * as React from "react";
import type * as models from "@ptah/lib-models";
import { Flex } from "antd";
import Title from "antd/es/typography/Title";

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: "100%",
    height: "100%",
    animation: "animationEnterLeftToRight 200ms",
  },
};
export default function ShowPrograms({
  show,
}: {
  show: models.Show;
}): JSX.Element {
  return (
    <div style={styles.container}>
      <Flex justify="center" vertical>
        <Title level={5}>PATCH</Title>
        <div>{show.name}</div>
        <div>{show.id}</div>
      </Flex>
    </div>
  );
}
