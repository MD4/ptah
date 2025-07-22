import { Box, Text } from "ink";
import React from "react";

import { theme } from "../theme.js";

export default function Confirm() {
  return (
    <Box
      flexGrow={1}
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      gap={1}
    >
      <Text bold color={theme.colorError}>
        Unload show?
      </Text>
      <Box padding={0} margin={0} flexDirection="column">
        <Text>
          <Text>Press </Text>
          <Text bold color={theme.colorSuccess}>
            [return]
          </Text>
          <Text> to proceed</Text>
        </Text>
        <Text>
          <Text>Press </Text>
          <Text bold color={theme.colorError}>
            [escape]
          </Text>
          <Text> to cancel</Text>
        </Text>
      </Box>
    </Box>
  );
}
