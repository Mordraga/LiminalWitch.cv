import { formatCommandHelpLines } from "./commands.js";
import {
    formatEntryLabel,
    formatPathLabel,
    getEntry,
    listChildren,
    resolveExistingPath,
    resolvePathForCd
} from "./portfolio-fs.js";

function pathPart(path, label = path) {
    return { type: "path", path, label };
}

function urlPart(href, label = href) {
    return { type: "link", href, label };
}

function renderDirectory(path, writeRichLog, writeLog) {
    const children = listChildren(path);
    if (children.length === 0) {
        writeLog("Directory is empty.");
        return;
    }

    const output = ["Contents: "];
    children.forEach((child, index) => {
        output.push(pathPart(child.path, formatEntryLabel(child)));
        if (index < children.length - 1) {
            output.push(" ");
        }
    });

    writeRichLog(output);
}

function changeDirectory(rawTarget, context) {
    const resolvedPath = resolvePathForCd(rawTarget, context.getCurrentPath());
    if (!resolvedPath) {
        context.writeLog(`Path not found: ${rawTarget}`);
        return;
    }

    const entry = getEntry(resolvedPath);
    if (!entry || entry.kind !== "dir") {
        context.writeLog(`Not a directory: ${resolvedPath}`);
        return;
    }

    context.setCurrentPath(resolvedPath);
    context.writeRichLog(["Now at ", pathPart(resolvedPath), "."]);
    renderDirectory(resolvedPath, context.writeRichLog, context.writeLog);
}

function openPortfolioPath(targetPath, context, options = {}) {
    const { announce = true } = options;
    const entry = getEntry(targetPath);
    if (!entry) {
        context.writeLog(`Path not found: ${targetPath}`);
        return;
    }

    if (entry.kind === "dir") {
        context.setCurrentPath(targetPath);
        if (announce) {
            context.writeRichLog(["Now at ", pathPart(targetPath), "."]);
        }
        renderDirectory(targetPath, context.writeRichLog, context.writeLog);
        return;
    }

    if (entry.kind === "file") {
        context.writeRichLog(["Opened ", pathPart(targetPath), "."]);
        for (const line of entry.lines ?? []) {
            context.writeLog(line);
        }
        return;
    }

    if (entry.kind === "link") {
        context.writeRichLog(["Opening external link: ", urlPart(entry.url, formatPathLabel(targetPath)), "."]);
        context.openExternal(entry.url);
    }
}

export function createCommandHandlers(context) {
    return {
        help() {
            context.writeLog("Available commands:");
            for (const line of formatCommandHelpLines(context.getCatalog())) {
                context.writeLog(`- ${line}`);
            }
            context.writeLog("Tip: paths in terminal output are clickable.");
        },
        clear() {
            context.clearLog();
        },
        enter() {
            context.writeLog("Boot sequence ready.");
            openPortfolioPath("/", context, { announce: false });
        },
        begin() {
            context.writeLog("Boot sequence ready.");
            openPortfolioPath("/", context, { announce: false });
        },
        pwd() {
            context.writeLog(context.getCurrentPath());
        },
        ls(args) {
            const lookupPath = args || context.getCurrentPath();
            const resolvedPath = resolveExistingPath(lookupPath, context.getCurrentPath());
            if (!resolvedPath) {
                context.writeLog(`Path not found: ${lookupPath}`);
                return;
            }

            const entry = getEntry(resolvedPath);
            if (!entry) {
                context.writeLog(`Path not found: ${lookupPath}`);
                return;
            }

            if (entry.kind !== "dir") {
                context.writeRichLog(["File: ", pathPart(resolvedPath), "."]);
                return;
            }

            renderDirectory(resolvedPath, context.writeRichLog, context.writeLog);
        },
        cd(args) {
            const rawTarget = args || "/";
            changeDirectory(rawTarget, context);
        },
        back() {
            changeDirectory("..", context);
        },
        open(args) {
            const targetInput = args || context.getCurrentPath();
            const resolvedPath = resolveExistingPath(targetInput, context.getCurrentPath());
            if (!resolvedPath) {
                context.writeLog(`Path not found: ${targetInput}`);
                return;
            }

            openPortfolioPath(resolvedPath, context);
        },
        contact() {
            openPortfolioPath("/contact", context);
        },
        test() {
            context.writeLog("What are you testing? WHY are you testing?");
        },
        credit() {
            context.writeLog("Webside designed and developed by Mordraga. ©2026")
        }
    };
}
