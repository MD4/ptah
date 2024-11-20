import { useInput, Box, Text } from "ink";
import SelectInput from "ink-select-input";
import Spinner from "ink-spinner";
import React, { useEffect } from "react";
import { Route } from "./route.types.js";
import { Item } from "./item.types.js";
import { theme } from "../theme.js";

export default function RouteLoadShow({
	navigate,
}: {
	navigate: (route: Route) => void;
}) {
	const [shows, setState] = React.useState<Item<string>[]>([]);

	useEffect(() => {
		fetch("http://localhost:5001/show")
			.then((res) => res.json())
			.then((shows) => shows as string[])
			.then((shows) =>
				setState(shows.map((show) => ({ label: show, value: show }))),
			)
			.catch(() => []);
	}, []);

	useInput((_, key) => {
		if (key.escape) {
			navigate({ path: "home" });
		}
	});

	const onSelect = React.useCallback(
		(item: Item<string>) => navigate({ path: "show", showName: item.value }),
		[],
	);

	return !shows.length ? (
		<Text>
			<Text color={theme.colorWarning}>
				<Spinner type="dots" />
			</Text>
			<Text> Loading</Text>
		</Text>
	) : (
		<Box flexDirection="column" gap={1}>
			<Text bold>Select a show:</Text>
			<SelectInput<string> items={shows} onSelect={onSelect} />
		</Box>
	);
}
