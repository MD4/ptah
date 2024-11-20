import { type Show, type ShowName } from "@ptah/lib-models";
import { deduplicate, isDefined } from "@ptah/lib-utils";
import { useInput, Box, Text } from "ink";
import Spinner from "ink-spinner";
import React, { useEffect, useMemo, useState } from "react";

import { useSystemApi, useSystemState } from "../providers/system-provider.js";
import { theme } from "../theme.js";
import { type Route } from "./route.types.js";
import Confirm from "../components/confim.js";

export default function RouteShow({
	showName,
	navigate,
}: {
	showName: ShowName;
	navigate: (route: Route) => void;
}): JSX.Element {
	const { loadShow, unloadShow } = useSystemApi();
	const { activeProgramsIds, tempo, showStatus } = useSystemState();
	const [show, setState] = useState<Show | undefined>();
	const [unloadingShow, setUnloadingShow] = useState(false);

	useEffect(() => {
		void fetch(`http://localhost:5001/show/${showName}`)
			.then((res) => res.json())
			.then((json) => json as Show)
			.then(setState)
			.then(() => {
				loadShow(showName);
			});
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

	const programs = useMemo(
		() => (show ? deduplicate(Object.values(show.programs)) : []),
		[show],
	);

	const activePrograms = useMemo(
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
					{showStatus === "running" && tempo ? `${String(tempo)} bpm` : ""}
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
