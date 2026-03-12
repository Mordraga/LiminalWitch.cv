const KOFI_URL = "https://ko-fi.com/";

const entries = [
    {
        path: "/",
        kind: "dir",
        description: "Root directory for the portfolio terminal.",
        children: ["/about-vtubing", "/about-pro", "/projects", "/contact"]
    },

    //===== About Me =====
    {
        path: "/about-pro",
        kind: "file",
        description: "About me but make it professional. Bleh.",
        lines: [
            "Mordraga (alias)",
            "Software Developer",
            "Focus",
            "AI Tooling, Automation Systems, Website Development",
            "",
            "Languages:",
            "Rust, Python, JS/HTML/CSS"
        ]
    },
    {
        path: "/about-vtubing",
        kind: "file",
        description: "About me profile.",
        lines: [
            "Mordraga | Eldritch Horror Vtuber",
            "Hello! I'm Mordraga or as some may know me, MRD-0. Your wonderful 'eldritch goddess' or whatever. I make",
            "cool things like this webside, AI tools and other interesting things."
        ]
    },

    // Intentionally hidden.
    {
        path: "/about-saryn",
        kind: "file",
        description: "Legal about me",
        lines: [
            "Hello! I am Saryn, the voice and creator of Mordraga, this site, and all of 'Mordraga's' little toys and",
            "creations.",
            "",
            "Title:",
            "Software Developer | Vtuber",
            "Focus",
            "AI Tooling, Automation Systems, Website Development",
            "",
            "Languages:",
            "Rust, Python, JS/HTML/CSS",
        ]
    },
    {
        path: "/projects",
        kind: "dir",
        description: "Selected work and experiments.",
        children: [
            "/websites", 
            "/ai-work", 
            "/worldbuilding-notes"]
    },

    //===== Website stuff =====
    {
        path: "/websites",
        kind: "dir",
        description: "Selected websites to show",
        children: [
            "/websites/liminal-witch.cv", 
            "/websites/mootskeeper.com"
        ]
    },
    {
        path: "/websites/liminal-witch.cv",
        kind: "file",
        description: "Terminal-first portfolio interface.",
        lines: [
            "Built as a static page terminal style portfolio to show off my latest projects! The site you are also",
            "currently looking at. <3",
            "Stack: vanilla JS modules, semantic HTML, custom CSS."
        ]
    },
    {
        path: "/websites/mootskeeper.com",
        kind: "file",
        description: "CRM website",
        lines: [
            "Built as a CRM management tool for 'moots', the app lets you register contacts inside of the tool",
            "Pull your data from other devices using twitch and google oauth logins",
            "And ensure you aren't drunk texting your friends at 4PM in the morning when it is 12 AM for them.",
            "Stack: vanilla JS modules, semantic HTML, custom CSS, FastAPI, PostgreSQL"
        ]
    },
    // ===== Worldbuilding =====
    {
        path: "/worldbuilding-notes",
        kind: "file",
        description: "Lore and writing sandbox.",
        lines: [
            "Couple of my current projects can fit under here such as my Vtubing itself being the biggest example.",
            "But another example I can think of are 'Polaris', a speculative biology TTRPG with DND inspired mechanics",
        ]
    },
    // ===== AI Stuf =====
    {
        path: "/ai-work",
        kind: "dir",
        description: "AI Tools and agents I have made.",
        children: [
            "/ai-work/Mai",
            "/ai-work/Selyros"
        ]
    },
    {
        path: "/ai-work/Mai",
        kind: "file",
        description: "Flirt LLM running off of Python and Openrouter",
        lines: [
            "AI prompt system to generate flirty content for my Vtubing streams",
            "Runs off of Openrouter for a modular model system controlled in a UI",
            "Designed with twitch-safety in mind and user opt-in in mind.",
            "",
            "Stack:",
            "Pure Python with mild JSON"
        ]
    },
    {
        path: "/ai-work/Selyros",
        kind: "file",
        description: "AI Model designed to operate around IFS systems",
        lines: [
            "AI prompt system designed around IFS parts theory to simulate multiple parts such as Managers, Firefighters and Exiles",
            "Runs off of Gemma3 hosted locally via Ollama.",
            "Designed with trauma awareness in mind",
            "",
            "Stack:",
            "Pure Python with mild JSON"
        ]
    },
    {
        path: "/contact",
        kind: "link",
        description: "Open Ko-fi DMs.",
        url: KOFI_URL
    }
];

const entryByPath = new Map(entries.map((entry) => [entry.path, entry]));

function collapsePath(segments) {
    const stack = [];
    for (const segment of segments) {
        if (!segment || segment === ".") {
            continue;
        }
        if (segment === "..") {
            stack.pop();
            continue;
        }
        stack.push(segment);
    }

    return stack.length > 0 ? `/${stack.join("/")}` : "/";
}

export function normalizePathInput(rawPath, currentPath = "/") {
    const input = String(rawPath ?? "").trim();
    if (!input) {
        return currentPath;
    }

    const basePath = input.startsWith("/") ? input : `${currentPath}/${input}`;
    return collapsePath(basePath.split("/"));
}

export function resolveExistingPath(rawPath, currentPath = "/") {
    const normalizedPath = normalizePathInput(rawPath, currentPath);
    return entryByPath.has(normalizedPath) ? normalizedPath : null;
}

function getParentPath(path) {
    if (path === "/") {
        return null;
    }

    const parts = path.split("/").filter(Boolean);
    parts.pop();
    return parts.length > 0 ? `/${parts.join("/")}` : "/";
}

function listAncestorPaths(path) {
    const ancestors = [];
    let parentPath = getParentPath(path);

    while (parentPath) {
        ancestors.push(parentPath);
        if (parentPath === "/") {
            break;
        }
        parentPath = getParentPath(parentPath);
    }

    return ancestors;
}

export function resolvePathForCd(rawPath, currentPath = "/") {
    const input = String(rawPath ?? "").trim();
    if (!input) {
        return "/";
    }

    const resolvedHere = resolveExistingPath(input, currentPath);
    if (resolvedHere) {
        return resolvedHere;
    }

    if (input.startsWith("/")) {
        return null;
    }

    for (const ancestorPath of listAncestorPaths(currentPath)) {
        const resolvedAtAncestor = resolveExistingPath(input, ancestorPath);
        if (resolvedAtAncestor) {
            return resolvedAtAncestor;
        }
    }

    return null;
}

export function getEntry(path) {
    return entryByPath.get(path) ?? null;
}

export function listChildren(path) {
    const entry = getEntry(path);
    if (!entry || entry.kind !== "dir") {
        return [];
    }

    return (entry.children ?? [])
        .map((childPath) => getEntry(childPath))
        .filter(Boolean);
}

export function formatPathLabel(path) {
    if (path === "/") {
        return "/";
    }

    const parts = path.split("/").filter(Boolean);
    return parts[parts.length - 1] ?? path;
}

export function formatEntryLabel(entry) {
    const base = formatPathLabel(entry.path);
    if (entry.kind === "dir") {
        return `${base}/`;
    }

    if (entry.kind === "link") {
        return `${base}@`;
    }

    return base;
}
