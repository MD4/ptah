#!/usr/bin/env node
import { render } from "ink";
import meow from "meow";
import React from "react";

import App from "./app.js";
import { kill, SystemProvider } from "./providers/system-provider.js";

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
