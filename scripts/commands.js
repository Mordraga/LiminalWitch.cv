const commandsUrl = new URL("./commands-list.json", import.meta.url);

const fallbackCommands = [
    { name: "help", aliases: ["help", "?"], usage: "help", description: "Show available commands." },
    { name: "clear", aliases: ["clear"], usage: "clear", description: "Clear the terminal output." },
    { name: "enter", aliases: ["enter"], usage: "enter", description: "Boot the portfolio terminal." },
    { name: "begin", aliases: ["begin"], usage: "begin", description: "Alias for enter." },
    { name: "pwd", aliases: ["pwd"], usage: "pwd", description: "Print the current path." },
    { name: "ls", aliases: ["ls", "dir"], usage: "ls [path]", description: "List entries at current path or target path." },
    { name: "cd", aliases: ["cd"], usage: "cd <path>", description: "Change current directory." },
    { name: "back", aliases: ["back"], usage: "back", description: "Go up one directory (same as cd ..)." },
    { name: "open", aliases: ["open", "cat"], usage: "open [path]", description: "Open a path. Links launch in a new tab." },
    { name: "contact", aliases: ["contact"], usage: "contact", description: "Open Ko-fi DMs." },
    { name: "test", aliases: ["test"], usage: "test", description: "Run the test response." },
    { name: "ping", aliases: ["ping"], usage: "ping", description: "Ping Pong toast." },
    { name: "pong", aliases: ["pong"], usage: "pong", description: "Pong Ping toast." },
    { name: "on_the_rocks", aliases: ["on the rocks", "on_the_rocks"], usage: "on_the_rocks", description: "Stay classy." },
    { name: "what_say_you", aliases: ["what say you", "what_say_you"], usage: "what_say_you", description: "Hidden phrase.", hidden: true }
];

function normalizeCommand(value) {
    return String(value ?? "").trim().toLowerCase();
}

function buildCommandCatalog(entries) {
    const commands = [];
    const byAlias = new Map();

    for (const entry of entries) {
        const name = normalizeCommand(entry?.name);
        if (!name) {
            continue;
        }

        const aliases = new Set([name]);
        const entryAliases = Array.isArray(entry?.aliases) ? entry.aliases : [];
        for (const alias of entryAliases) {
            const normalizedAlias = normalizeCommand(alias);
            if (normalizedAlias) {
                aliases.add(normalizedAlias);
            }
        }

        const command = {
            name,
            aliases: [...aliases],
            usage: String(entry?.usage ?? name).trim(),
            description: String(entry?.description ?? "").trim(),
            hidden: Boolean(entry?.hidden)
        };

        commands.push(command);
        for (const alias of command.aliases) {
            if (!byAlias.has(alias)) {
                byAlias.set(alias, command);
            }
        }
    }

    const aliasSearch = [...byAlias.keys()].sort((left, right) => right.length - left.length);

    return { commands, byAlias, aliasSearch };
}

export const defaultCommandCatalog = buildCommandCatalog(fallbackCommands);

export async function loadCommandCatalog() {
    try {
        const response = await fetch(commandsUrl);
        if (!response.ok) {
            return defaultCommandCatalog;
        }

        const data = await response.json();
        const entries = Array.isArray(data?.commands) ? data.commands : [];
        if (entries.length === 0) {
            return defaultCommandCatalog;
        }

        return buildCommandCatalog(entries);
    } catch {
        return defaultCommandCatalog;
    }
}

export function resolveCommand(input, catalog) {
    const normalized = normalizeCommand(input);
    if (!normalized) {
        return null;
    }

    return catalog.byAlias.get(normalized) ?? null;
}

export function parseCommandInput(input, catalog) {
    const rawInput = String(input ?? "").trim();
    if (!rawInput) {
        return null;
    }

    const normalizedInput = rawInput.toLowerCase();

    for (const alias of catalog.aliasSearch) {
        if (normalizedInput === alias) {
            return { command: catalog.byAlias.get(alias), args: "" };
        }
        if (normalizedInput.startsWith(`${alias} `)) {
            const args = rawInput.slice(alias.length).trim();
            return { command: catalog.byAlias.get(alias), args };
        }
    }

    return null;
}

export function formatCommandHelp(catalog) {
    return catalog.commands
        .filter((command) => !command.hidden)
        .map((command) => `${command.usage}: ${command.description}`)
        .join(" | ");
}

export function formatCommandHelpLines(catalog) {
    return catalog.commands
        .filter((command) => !command.hidden)
        .map((command) => `${command.usage} - ${command.description}`);
}
