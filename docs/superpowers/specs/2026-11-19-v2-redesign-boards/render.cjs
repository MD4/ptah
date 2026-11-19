const { chromium } = require("/Users/marty/projects/ptah-v2/apps/web/node_modules/@playwright/test");
const fs = require("fs");
(async () => {
  const b = await chromium.launch();
  for (const name of process.argv.slice(2)) {
    const src = fs.readFileSync(`project/${name}.dc.html`, "utf8");
    const inner = src.slice(src.indexOf("<x-dc>") + 6, src.indexOf("</x-dc>")).replace(/<\/?helmet>/g, "");
    const m = /"width":(\d+),"height":(\d+)/.exec(src);
    const p = await b.newPage({ viewport: { width: +m[1], height: +m[2] }, deviceScaleFactor: 1 });
    await p.setContent(`<!doctype html><html><head><meta charset="utf-8"></head><body>${inner}</body></html>`, { waitUntil: "networkidle" });
    await p.waitForTimeout(500);
    await p.screenshot({ path: `shots/${name}.png` });
    await p.close();
    console.log(name);
  }
  await b.close();
})();
