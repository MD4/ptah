import { Button, Flex } from "antd";
import TypographyLink from "antd/es/typography/Link";
import Text from "antd/es/typography/Text";
import * as React from "react";
import { Link } from "react-router-dom";

import { useSystemApi, useSystemState } from "../../domain/system.domain";
import FullCenteredLayout from "../layouts/full-centered.layout";

const styles = {
  container: { width: "400px" },
  logo: {
    aspectRatio: 400 / 90,
    width: "380px",
    maxWidth: "80vw",
  },
  button: {
    width: "100%",
  },
} satisfies Record<string, React.CSSProperties>;

export default function HomePage() {
  const { connected } = useSystemState();
  const { unloadShow } = useSystemApi();

  React.useEffect(() => {
    if (connected) {
      unloadShow();
    }
  }, [connected, unloadShow]);

  return (
    <FullCenteredLayout>
      <Flex gap="large" style={styles.container} vertical>
        <Flex align="center" gap="middle" vertical>
          <img
            alt="PTAH logo"
            className="logo"
            src="ptah-logo-color.svg"
            style={styles.logo}
          />
          <legend>Control your lights.</legend>
        </Flex>
        <div />
        <Link to="/show">
          <Button
            className="menu-button"
            size="large"
            style={styles.button}
            type="text"
          >
            Shows
          </Button>
        </Link>
        <Link to="/program">
          <Button
            className="menu-button"
            size="large"
            style={styles.button}
            type="text"
          >
            Programs
          </Button>
        </Link>
        <Link to="/settings">
          <Button
            className="menu-button"
            size="large"
            style={styles.button}
            type="text"
          >
            Settings
          </Button>
        </Link>
        <div />
        <Flex justify="center">
          <Text type="secondary">
            code by{" "}
            <TypographyLink href="https://github.com/md4" target="_blank">
              @md4
            </TypographyLink>
          </Text>
        </Flex>
      </Flex>
    </FullCenteredLayout>
  );
}
