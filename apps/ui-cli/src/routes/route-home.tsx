import { Box, Text, useApp } from "ink";
import SelectInput from "ink-select-input";
import React, { useCallback } from "react";

import type { Item } from "./item.types.js";
import type { Route } from "./route.types.js";

type MenuItemValue = "load-show" | "debug" | "quit";

export function RouteHome({
  navigate,
}: {
  navigate: (route: Route) => void;
}): JSX.Element {
  const { exit } = useApp();
  const items: Item<MenuItemValue>[] = [
    { label: "Load show", value: "load-show" },
    { label: "Debug", value: "debug" },
    { label: "Quit", value: "quit" },
  ];

  const onSelect = useCallback(
    (item: Item<MenuItemValue>) => {
      switch (item.value) {
        case "load-show":
          navigate({ path: "load-show" });
          break;
        case "debug":
          navigate({ path: "debug" });
          break;
        case "quit":
          exit();
          console.clear();
      }
    },
    [navigate, exit],
  );

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold>Select an action:</Text>
      <SelectInput<MenuItemValue> items={items} onSelect={onSelect} />
    </Box>
  );
}
