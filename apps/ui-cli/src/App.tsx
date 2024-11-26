import { Box } from "ink";
import React, { useEffect, useState } from "react";

import Header from "./components/header.js";
import Statuses from "./components/statuses.js";
import { useSystemState } from "./providers/system-provider.js";
import { RouteHome } from "./routes/route-home.js";
import RouteLoadShow from "./routes/route-load-show.js";
import RouteShow from "./routes/route-show.js";
import { type Route } from "./routes/route.types.js";
import { theme } from "./theme.js";

export default function App({
	packageName,
	packageVersion,
}: {
	packageName: string;
	packageVersion: string;
}): JSX.Element {
	const [width, setWidth] = useState(process.stdout.columns - 2);
	const [height, setHeight] = useState(process.stdout.rows - 1);
	const [route, setRoute] = useState<Route>({ path: "home" });

	const state = useSystemState();

	useEffect(() => {
		process.stdout.on("resize", () => {
			const { columns, rows } = process.stdout;

			if (columns !== width) {
				setWidth(columns - 2);
			}
			if (rows !== height) {
				setHeight(rows - 1);
			}
		});
	}, []);

	return (
		<Box
			flexDirection="column"
			width={width - 4}
			height={height - 2}
			alignItems="center"
			borderStyle="round"
			borderColor={theme.colorPrimary}
			paddingX={1}
			marginX={2}
			marginY={1}
		>
			<Header packageName={packageName} packageVersion={packageVersion} />
			<Box
				width="100%"
				borderStyle="round"
				borderColor={theme.colorPrimary}
				flexGrow={1}
				justifyContent="center"
				alignItems="center"
			>
				{route.path === "home" && <RouteHome navigate={setRoute} />}
				{route.path === "load-show" && <RouteLoadShow navigate={setRoute} />}
				{route.path === "show" && (
					<RouteShow navigate={setRoute} showName={route.showName} />
				)}
			</Box>
			<Statuses {...state} />
		</Box>
	);
}
