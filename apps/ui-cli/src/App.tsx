import { Box } from "ink";
import React, { useState } from "react";

import Header from "./components/header.js";
import Statuses from "./components/statuses.js";
import { useViewport } from "./effects/viewport.js";
import { useSystemState } from "./providers/system-provider.js";
import { RouteDebug } from "./routes/route-debug.js";
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
	const state = useSystemState();
	const { width, height } = useViewport();
	const [route, setRoute] = useState<Route>({ path: "home" });

	const title = route.path.toUpperCase().replace(/-/g, " ");

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
			<Header
				packageName={packageName}
				packageVersion={packageVersion}
				title={title}
			/>
			<Box
				width="100%"
				borderStyle="round"
				borderColor={theme.colorPrimary}
				flexGrow={1}
				justifyContent="center"
				alignItems="center"
			>
				{route.path === "home" && <RouteHome navigate={setRoute} />}
				{route.path === "debug" && <RouteDebug navigate={setRoute} />}
				{route.path === "load-show" && <RouteLoadShow navigate={setRoute} />}
				{route.path === "show" && (
					<RouteShow navigate={setRoute} showName={route.showName} />
				)}
			</Box>
			<Statuses {...state} />
		</Box>
	);
}
