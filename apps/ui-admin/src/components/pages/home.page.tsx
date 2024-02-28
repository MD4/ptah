import { Button, Flex } from "antd";
import * as React from "react";
import Text from "antd/es/typography/Text";
import TypographyLink from "antd/es/typography/Link";
import { Link } from "react-router-dom";
import FullCenteredLayout from "../layouts/full-centered.layout";
import { useSystem } from "../../domain/system.domain";

const styles: Record<string, React.CSSProperties> = {
  container: { width: "400px" },
  logo: {
    aspectRatio: 400 / 90,
    width: "380px",
  },
  button: {
    width: "100%",
  },
};

export default function HomePage(): JSX.Element {
  const system = useSystem();

  React.useEffect(() => {
    if (system.state.connected) {
      system.api.unloadShow();
    }
  }, [system.api, system.state.connected]);

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
