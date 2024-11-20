#!/usr/bin/env node
import meow from "meow";
import { render } from "ink";
import React from "react";

import App from "./App.js";
import { kill, SystemProvider } from "./providers/SystemProvider.js";

const cli = meow(
	`
	Usage
	  $ ui-cli
`,
	{ importMeta: import.meta },
);

await render(
	<SystemProvider>
		<App
			packageName={String(cli.pkg.name)}
			packageVersion={String(cli.pkg.version)}
		/>
	</SystemProvider>,
).waitUntilExit();

kill();
