import React, { useEffect } from "react";
import { Box } from "ink";
import { useSystemState } from "./providers/SystemProvider.js";
import { RouteHome } from "./routes/RouteHome.js";
import { Route } from "./routes/route.types.js";
import { theme } from "./theme.js";
import RouteLoadShow from "./routes/RouteLoadShow.js";
import RouteShow from "./routes/RouteShow.js";
import Statuses from "./components/Statuses.js";
import Header from "./components/Header.js";

export default function App({
	packageName,
	packageVersion,
}: {
	packageName: string;
	packageVersion: string;
}) {
	const [width, setWidth] = React.useState(process.stdout.columns);
	const [height, setHeight] = React.useState(process.stdout.rows);
	const [route, setRoute] = React.useState<Route>({ path: "home" });

	const state = useSystemState();

	useEffect(() => {
		process.stdout.on("resize", () => {
			const { columns, rows } = process.stdout;

			if (columns !== width) {
				setWidth(columns);
			}
			if (rows !== height) {
				setHeight(rows);
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
