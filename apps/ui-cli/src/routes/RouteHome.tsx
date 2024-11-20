import React from "react";
import { Box, Text, useApp } from "ink";
import SelectInput from "ink-select-input";
import { Route } from "./route.types.js";
import { Item } from "./item.types.js";

type MenuItemValue = "load-show" | "quit";

export function RouteHome({ navigate }: { navigate: (route: Route) => void }) {
	const { exit } = useApp();
	const items: Item<MenuItemValue>[] = [
		{ label: "Load show", value: "load-show" },
		{ label: "Quit", value: "quit" },
	];

	const onSelect = React.useCallback((item: Item<MenuItemValue>) => {
		switch (item.value) {
			case "load-show":
				navigate({ path: "load-show" });
				break;
			case "quit":
				exit();
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
