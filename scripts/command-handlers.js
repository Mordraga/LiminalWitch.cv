import { formatCommandHelpLines } from "./commands.js";

function pathPart(path, label = path) {
    return { type: "path", path, label };
}

function urlPart(href, label = href) {
    return { type: "link", href, label };
}

function renderDirectory(path, context) {
    const children = context.fs.listChildren(path);
    if (children.length === 0) {
        context.writeLog("Directory is empty.");
        return;
    }

    const output = ["Contents: "];
    children.forEach((child, index) => {
        if (child.kind === "link" && child.url) {
            output.push(urlPart(child.url, context.fs.formatEntryLabel(child)));
        } else {
            output.push(pathPart(child.path, context.fs.formatEntryLabel(child)));
        }

        if (index < children.length - 1) {
            output.push(" ");
        }
    });

    context.writeRichLog(output);
}

function changeDirectory(rawTarget, context) {
    const resolvedPath = context.fs.resolvePathForCd(rawTarget, context.fs.getCurrentPath());
    if (!resolvedPath) {
        context.writeLog(`Path not found: ${rawTarget}`);
        return;
    }

    const entry = context.fs.getEntry(resolvedPath);
    if (!entry || entry.kind !== "dir") {
        context.writeLog(`Not a directory: ${resolvedPath}`);
        return;
    }

    context.fs.setCurrentPath(resolvedPath);
    context.writeRichLog(["Now at ", pathPart(resolvedPath), "."]);
    renderDirectory(resolvedPath, context);
}

function openPortfolioPath(targetPath, context, options = {}) {
    const { announce = true } = options;
    const entry = context.fs.getEntry(targetPath);
    if (!entry) {
        context.writeLog(`Path not found: ${targetPath}`);
        return;
    }

    if (entry.kind === "dir") {
        context.fs.setCurrentPath(targetPath);
        if (announce) {
            context.writeRichLog(["Now at ", pathPart(targetPath), "."]);
        }
        renderDirectory(targetPath, context);
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
        context.writeRichLog([
            "External link requested: ",
            urlPart(entry.url, context.fs.formatPathLabel(targetPath)),
            "."
        ]);
        context.openExternal(entry.url);
    }
}

export function createCommandHandlers(context) {
    if (!context?.fs) {
        throw new Error("createCommandHandlers requires context.fs");
    }

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
            context.writeLog(context.fs.getCurrentPath());
        },
        ls(args) {
            const lookupPath = args || context.fs.getCurrentPath();
            const resolvedPath = context.fs.resolveExistingPath(lookupPath, context.fs.getCurrentPath());
            if (!resolvedPath) {
                context.writeLog(`Path not found: ${lookupPath}`);
                return;
            }

            const entry = context.fs.getEntry(resolvedPath);
            if (!entry) {
                context.writeLog(`Path not found: ${lookupPath}`);
                return;
            }

            if (entry.kind !== "dir") {
                context.writeRichLog(["File: ", pathPart(resolvedPath), "."]);
                return;
            }

            renderDirectory(resolvedPath, context);
        },
        cd(args) {
            const rawTarget = args || "/";
            changeDirectory(rawTarget, context);
        },
        back() {
            changeDirectory("..", context);
        },
        open(args) {
            const targetInput = args || context.fs.getCurrentPath();
            const resolvedPath = context.fs.resolveExistingPath(targetInput, context.fs.getCurrentPath());
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
            context.showToast("What are you testing? WHY are you testing?");
        },
        credit() {
            context.writeLog("Website designed and developed by Mordraga. ©2026");
        },
        ping() {
            context.writeLog("Pong. <3")
            context.showToast("Pong. <3")
        },
        on_the_rocks() {
            context.writeLog("Stay Classy.")
            context.showToast("Stay Classy. 🍸")
        }

    };
}
