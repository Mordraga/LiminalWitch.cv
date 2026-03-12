const version = new URL(import.meta.url).searchParams.get("v");
const terminalModule = version ? `./terminal.js?v=${encodeURIComponent(version)}` : "./terminal.js";

import(terminalModule);
