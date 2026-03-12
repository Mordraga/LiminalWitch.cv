const entriesUrl = new URL("./portfolio-entries.json", import.meta.url);

const fallbackEntries = [
    {
        path: "/",
        kind: "dir",
        description: "Root directory for the portfolio terminal.",
        children: ["/contact"]
    },
    {
        path: "/contact",
        kind: "link",
        description: "Open Ko-fi DMs.",
        url: "https://ko-fi.com/"
    }
];

function isNonEmptyString(value) {
    return typeof value === "string" && value.trim().length > 0;
}

function sanitizeEntry(rawEntry) {
    if (!rawEntry || typeof rawEntry !== "object") {
        return null;
    }

    const path = isNonEmptyString(rawEntry.path) ? rawEntry.path.trim() : "";
    const kind = isNonEmptyString(rawEntry.kind) ? rawEntry.kind.trim() : "";
    if (!path || !kind) {
        return null;
    }

    const entry = {
        path,
        kind,
        description: isNonEmptyString(rawEntry.description) ? rawEntry.description.trim() : ""
    };

    if (kind === "dir") {
        entry.children = Array.isArray(rawEntry.children)
            ? rawEntry.children.filter(isNonEmptyString).map((child) => child.trim())
            : [];
    }

    if (kind === "file") {
        entry.lines = Array.isArray(rawEntry.lines)
            ? rawEntry.lines.map((line) => String(line ?? ""))
            : [];
    }

    if (kind === "link") {
        entry.url = isNonEmptyString(rawEntry.url) ? rawEntry.url.trim() : "";
    }

    return entry;
}

function sanitizeEntries(rawEntries) {
    if (!Array.isArray(rawEntries)) {
        return [];
    }

    const deduped = new Map();
    for (const rawEntry of rawEntries) {
        const entry = sanitizeEntry(rawEntry);
        if (!entry) {
            continue;
        }
        deduped.set(entry.path, entry);
    }

    return [...deduped.values()];
}

function buildEntryMap(entries) {
    return new Map(entries.map((entry) => [entry.path, entry]));
}

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

export class PortfolioFS {
    constructor(options = {}) {
        const { entries = fallbackEntries, currentPath = "/" } = options;
        this.entries = [];
        this.entryByPath = new Map();
        this.currentPath = "/";
        this.setEntries(entries);
        this.setCurrentPath(currentPath);
    }

    setEntries(rawEntries) {
        const sanitized = sanitizeEntries(rawEntries);
        const entries = sanitized.length > 0 ? sanitized : sanitizeEntries(fallbackEntries);
        this.entries = entries;
        this.entryByPath = buildEntryMap(entries);

        const currentEntry = this.getEntry(this.currentPath);
        if (!currentEntry || currentEntry.kind !== "dir") {
            this.currentPath = "/";
        }
    }

    async loadEntries() {
        try {
            const response = await fetch(entriesUrl);
            if (!response.ok) {
                return false;
            }

            const data = await response.json();
            const rawEntries = Array.isArray(data) ? data : data?.entries;
            const sanitized = sanitizeEntries(rawEntries);
            if (sanitized.length === 0) {
                return false;
            }

            this.setEntries(sanitized);
            return true;
        } catch {
            return false;
        }
    }

    getCurrentPath() {
        return this.currentPath;
    }

    setCurrentPath(path) {
        const normalized = String(path ?? "").trim() || "/";
        const entry = this.getEntry(normalized);
        if (!entry || entry.kind !== "dir") {
            return false;
        }

        this.currentPath = normalized;
        return true;
    }

    normalizePathInput(rawPath, currentPath = this.currentPath) {
        const input = String(rawPath ?? "").trim();
        if (!input) {
            return currentPath;
        }

        const basePath = input.startsWith("/") ? input : `${currentPath}/${input}`;
        return collapsePath(basePath.split("/"));
    }

    resolveExistingPath(rawPath, currentPath = this.currentPath) {
        const normalizedPath = this.normalizePathInput(rawPath, currentPath);
        return this.entryByPath.has(normalizedPath) ? normalizedPath : null;
    }

    resolvePathForCd(rawPath, currentPath = this.currentPath) {
        const input = String(rawPath ?? "").trim();
        if (!input) {
            return "/";
        }

        const resolvedHere = this.resolveExistingPath(input, currentPath);
        if (resolvedHere) {
            return resolvedHere;
        }

        if (input.startsWith("/")) {
            return null;
        }

        for (const ancestorPath of listAncestorPaths(currentPath)) {
            const resolvedAtAncestor = this.resolveExistingPath(input, ancestorPath);
            if (resolvedAtAncestor) {
                return resolvedAtAncestor;
            }
        }

        return null;
    }

    getEntry(path) {
        return this.entryByPath.get(path) ?? null;
    }

    listChildren(path) {
        const entry = this.getEntry(path);
        if (!entry || entry.kind !== "dir") {
            return [];
        }

        return (entry.children ?? [])
            .map((childPath) => this.getEntry(childPath))
            .filter(Boolean);
    }

    formatPathLabel(path) {
        if (path === "/") {
            return "/";
        }

        const parts = path.split("/").filter(Boolean);
        return parts[parts.length - 1] ?? path;
    }

    formatEntryLabel(entry) {
        const base = this.formatPathLabel(entry.path);
        if (entry.kind === "dir") {
            return `${base}/`;
        }

        if (entry.kind === "link") {
            return `${base}@`;
        }

        return base;
    }
}

export function createPortfolioFS(options = {}) {
    return new PortfolioFS(options);
}
