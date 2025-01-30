import { Box, Text, useInput } from "ink";
import React, { useEffect, useState } from "react";

import { useViewport } from "../effects/viewport.js";
import { useSystemApi, useSystemState } from "../providers/system-provider.js";
import type { Route } from "./route.types.js";

export function RouteDebug({
  navigate,
}: {
  navigate: (route: Route) => void;
}): JSX.Element {
  const { height } = useViewport();
  const { setDmxDebug } = useSystemApi();
  const { dmxDebugOutputs } = useSystemState();

  const [scrollTop, setScrollTop] = useState(0);

  useEffect(() => {
    setDmxDebug(true);

    return () => {
      setDmxDebug(false);
    };
  }, [setDmxDebug]);

  useInput((_, key) => {
    if (key.escape) {
      navigate({ path: "home" });
    } else if (key.upArrow) {
      setScrollTop(scrollTop + 1);
    } else if (key.downArrow) {
      setScrollTop(scrollTop - 1);
    }
  });

  const getColor = (output: number): string =>
    `rgb(255, ${String(255 - output)}, ${String(255 - output)})`;

  return (
    <Box overflowY="hidden" height={height - 12}>
      <Box gap={1} flexWrap="wrap" marginY={scrollTop}>
        {dmxDebugOutputs.map((output) => (
          // biome-ignore lint/correctness/useJsxKeyInIterable: can't provide a key here
          <Text color={getColor(output)}>
            {String(output).padStart(3, " ")}
          </Text>
        ))}
      </Box>
    </Box>
  );
}
