import { Box, Text, useApp } from "ink";
import SelectInput from "ink-select-input";
import React, { useCallback } from "react";

import { type Item } from "./item.types.js";
import { type Route } from "./route.types.js";

type MenuItemValue = "load-show" | "quit";

export function RouteHome({
	navigate,
}: {
	navigate: (route: Route) => void;
}): JSX.Element {
	const { exit } = useApp();
	const items: Item<MenuItemValue>[] = [
		{ label: "Load show", value: "load-show" },
		{ label: "Quit", value: "quit" },
	];

	const onSelect = useCallback((item: Item<MenuItemValue>) => {
		switch (item.value) {
			case "load-show":
				navigate({ path: "load-show" });
				break;
			case "quit":
				exit();
				// eslint-disable-next-line no-console -- This is a CLI
				console.clear();
		}
	}, []);

	return (
		<Box flexDirection="column" gap={1}>
			<Text bold>Select an action:</Text>
			<SelectInput<MenuItemValue> items={items} onSelect={onSelect} />
		</Box>
	);
}
