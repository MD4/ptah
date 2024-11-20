import { Box, Text } from "ink";
import React from "react";
import { theme } from "../theme.js";

export default function Header({
	packageName,
	packageVersion,
}: {
	packageName: string;
	packageVersion: string;
}) {
	return (
		<Box alignItems="center" justifyContent="space-between" width="100%">
			<Box
				paddingX={3}
				paddingY={0}
				borderStyle="round"
				borderColor={theme.colorPrimary}
				justifyContent="center"
				alignItems="center"
			>
				<Text bold>P T A H</Text>
			</Box>

			<Text color={theme.colorPrimary}>
				{packageName}@{packageVersion}
			</Text>
		</Box>
	);
}
