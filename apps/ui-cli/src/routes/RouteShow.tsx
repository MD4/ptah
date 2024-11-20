import { Show, ShowName } from "@ptah/lib-models";
import { deduplicate, isDefined } from "@ptah/lib-utils";
import { useInput, Box, Text } from "ink";
import Spinner from "ink-spinner";
import React, { useEffect } from "react";
import { useSystemApi, useSystemState } from "../providers/SystemProvider.js";
import { theme } from "../theme.js";
import { Route } from "./route.types.js";
import Confirm from "../components/Confim.js";

export default function RouteShow({
	showName,
	navigate,
}: {
	showName: ShowName;
	navigate: (route: Route) => void;
}) {
	const { loadShow, unloadShow } = useSystemApi();
	const { activeProgramsIds, tempo, showStatus } = useSystemState();
	const [show, setState] = React.useState<Show | undefined>();
	const [unloadingShow, setUnloadingShow] = React.useState(false);

	useEffect(() => {
		fetch(`http://localhost:5001/show/${showName}`)
			.then((res) => res.json())
			.then((show) => show as Show)
			.then(setState)
			.then(() => loadShow(showName));
	}, []);

	useInput((_, key) => {
		if (key.escape) {
			setUnloadingShow(!unloadingShow);
		} else if (key.return) {
			if (unloadingShow) {
				unloadShow();
				navigate({ path: "load-show" });
			}
		}
	});

	const programs = React.useMemo(
		() => (show ? deduplicate(Object.values(show.programs)) : []),
		[show],
	);

	const activePrograms = React.useMemo(
		() =>
			show
				? activeProgramsIds
						.map((id) => show.mapping[id])
						.filter(isDefined)
						.map((programId) => show.programs[programId])
						.filter(isDefined)
				: [],
		[activeProgramsIds, show],
	);

	return !show ? (
		<Text>
			<Text color={theme.colorWarning}>
				<Spinner type="dots" />
			</Text>
			{" Loading"}
		</Text>
	) : (
		<Box
			flexDirection="column"
			alignItems="center"
			paddingX={1}
			gap={1}
			width="100%"
			height="100%"
		>
			<Box width="100%" justifyContent="space-between">
				<Text bold color={theme.colorPrimary}>
					{show.name.toUpperCase()}
				</Text>
				<Text bold color={theme.colorPrimary}>
					{showStatus === "running" && tempo ? `${tempo} bpm` : ""}
				</Text>
				<Text
					bold
					color={
						showStatus === "running" ? theme.colorSuccess : theme.colorError
					}
				>
					[{showStatus.toUpperCase()}]
				</Text>
			</Box>

			{unloadingShow && <Confirm />}
			{!unloadingShow && (
				<Box
					width="100%"
					flexGrow={1}
					flexDirection="column"
					flexWrap="wrap"
					rowGap={0}
					columnGap={1}
					overflow="hidden"
				>
					{programs.map((program) => (
						<Text
							key={program}
							color={activePrograms.includes(program) ? "white" : "grey"}
						>
							<Text color={theme.colorPrimary}>•</Text> {program}
						</Text>
					))}
				</Box>
			)}
		</Box>
	);
}
