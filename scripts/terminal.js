import { createCommandHandlers } from "./command-handlers.js";
import { defaultCommandCatalog, loadCommandCatalog, parseCommandInput } from "./commands.js";

const promptForm = document.getElementById("terminalPrompt");
const inputShell = document.getElementById("inputShell");
const promptText = document.getElementById("promptText");
const log = document.getElementById("terminalLog");
const commandTokens = document.querySelectorAll("codeblock[data-command]");

const placeholderText = "Input Command";
const minChars = 12;
const maxChars = 56;
const typingMsPerChar = 22;
const typingMinMs = 200;
const typingMaxMs = 1400;
const typingGapMs = 40;
let commandBuffer = "";
let commandCatalog = defaultCommandCatalog;
let currentPath = "/";
const commandHistory = [];
let historyIndex = 0;
let historyDraft = "";
let renderQueue = Promise.resolve();
let renderEpoch = 0;

function syncPromptUI() {
    const visibleText = commandBuffer || placeholderText;
    const chars = Math.min(maxChars, Math.max(minChars, visibleText.length + 1));
    inputShell.style.width = `${chars}ch`;
    promptText.textContent = visibleText;
    promptText.classList.toggle("promptText--placeholder", commandBuffer.length === 0);
}

function clampNumber(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function estimateRichLength(parts) {
    return parts.reduce((total, part) => {
        if (typeof part === "string") {
            return total + part.length;
        }

        if (part?.label) {
            return total + String(part.label).length;
        }

        if (part?.path) {
            return total + String(part.path).length;
        }

        if (part?.href) {
            return total + String(part.href).length;
        }

        return total;
    }, 0);
}

function applyTypingAnimation(line, contentLength) {
    const length = Math.max(1, Number(contentLength) || 1);
    const duration = clampNumber(length * typingMsPerChar, typingMinMs, typingMaxMs);
    const steps = clampNumber(Math.round(length), 8, 90);

    line.classList.add("terminalLine--typing");
    line.style.setProperty("--typing-duration", `${duration}ms`);
    line.style.setProperty("--typing-steps", String(steps));

    return duration;
}

function enqueueLine(line, contentLength) {
    const epochAtEnqueue = renderEpoch;

    renderQueue = renderQueue.then(
        () => new Promise((resolve) => {
            if (epochAtEnqueue !== renderEpoch) {
                resolve();
                return;
            }

            const duration = applyTypingAnimation(line, contentLength);
            log.appendChild(line);
            log.scrollTop = log.scrollHeight;
            window.setTimeout(resolve, duration + typingGapMs);
        })
    );
}

function writeLog(text, className = "") {
    const line = document.createElement("p");
    line.className = className;
    line.textContent = text;
    enqueueLine(line, String(text ?? "").length);
}

function writeRichLog(parts, className = "") {
    const line = document.createElement("p");
    line.className = className;

    for (const part of parts) {
        if (typeof part === "string") {
            line.appendChild(document.createTextNode(part));
            continue;
        }

        if (part?.type === "path") {
            const token = document.createElement("button");
            token.type = "button";
            token.className = "terminalToken terminalToken--path";
            token.dataset.path = part.path;
            token.textContent = part.label ?? part.path;
            line.appendChild(token);
            continue;
        }

        if (part?.type === "link") {
            const token = document.createElement("a");
            token.className = "terminalToken terminalToken--link";
            token.href = part.href;
            token.target = "_blank";
            token.rel = "noopener noreferrer";
            token.textContent = part.label ?? part.href;
            line.appendChild(token);
        }
    }

    enqueueLine(line, estimateRichLength(parts));
}

const commandHandlers = createCommandHandlers({
    writeLog,
    writeRichLog,
    clearLog: () => {
        renderEpoch += 1;
        renderQueue = Promise.resolve();
        log.textContent = "";
    },
    getCatalog: () => commandCatalog,
    getCurrentPath: () => currentPath,
    setCurrentPath: (path) => {
        currentPath = path;
    },
    openExternal: (href) => {
        window.open(href, "_blank", "noopener,noreferrer");
    }
});

function runCommand(raw) {
    const trimmedInput = raw.trim();
    if (!trimmedInput) {
        return;
    }

    writeLog(`> ${raw}`, "echo");

    const parsed = parseCommandInput(trimmedInput, commandCatalog);
    if (!parsed) {
        writeLog(`Unknown command: ${trimmedInput.toLowerCase()}. Type 'help'.`);
        return;
    }

    const { command, args } = parsed;
    const handler = commandHandlers[command.name];
    if (!handler) {
        writeLog(`Command '${command.name}' is configured but not implemented.`);
        return;
    }

    handler(args);
}

function submitBuffer() {
    const submittedCommand = commandBuffer;
    const hasContent = submittedCommand.trim().length > 0;
    if (hasContent) {
        commandHistory.push(submittedCommand);
        historyIndex = commandHistory.length;
        historyDraft = "";
    }

    runCommand(commandBuffer);
    commandBuffer = "";
    historyIndex = commandHistory.length;
    historyDraft = "";
    syncPromptUI();
}

function handleTyping(event) {
    if (event.key === "ArrowUp") {
        event.preventDefault();
        if (commandHistory.length === 0) {
            return;
        }

        if (historyIndex >= commandHistory.length) {
            historyDraft = commandBuffer;
            historyIndex = commandHistory.length - 1;
        } else if (historyIndex > 0) {
            historyIndex -= 1;
        }

        commandBuffer = commandHistory[historyIndex] ?? "";
        syncPromptUI();
        return;
    }

    if (event.key === "ArrowDown") {
        event.preventDefault();
        if (commandHistory.length === 0) {
            return;
        }

        if (historyIndex < commandHistory.length - 1) {
            historyIndex += 1;
            commandBuffer = commandHistory[historyIndex] ?? "";
        } else {
            historyIndex = commandHistory.length;
            commandBuffer = historyDraft;
            historyDraft = "";
        }

        syncPromptUI();
        return;
    }

    if (event.key === "Enter") {
        event.preventDefault();
        submitBuffer();
        return;
    }

    if (event.key === "Backspace") {
        event.preventDefault();
        historyIndex = commandHistory.length;
        historyDraft = "";
        commandBuffer = commandBuffer.slice(0, -1);
        syncPromptUI();
        return;
    }

    if (event.key === "Escape") {
        event.preventDefault();
        historyIndex = commandHistory.length;
        historyDraft = "";
        commandBuffer = "";
        syncPromptUI();
        return;
    }

    if (event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) {
        return;
    }

    event.preventDefault();
    historyIndex = commandHistory.length;
    historyDraft = "";
    commandBuffer += event.key;
    syncPromptUI();
}

async function initializeTerminal() {
    commandCatalog = await loadCommandCatalog();

    promptForm.addEventListener("click", () => {
        promptText.textContent = "";
        inputShell.focus();
    });

    inputShell.addEventListener("keydown", handleTyping);
    inputShell.addEventListener("focus", () => inputShell.classList.add("is-focused"));
    inputShell.addEventListener("blur", () => inputShell.classList.remove("is-focused"));

    inputShell.addEventListener("paste", (event) => {
        const pastedText = event.clipboardData?.getData("text") ?? "";
        if (!pastedText) {
            return;
        }
        event.preventDefault();
        historyIndex = commandHistory.length;
        historyDraft = "";
        commandBuffer += pastedText.replace(/[\r\n]+/g, " ");
        syncPromptUI();
    });

    log.addEventListener("click", (event) => {
        const target = event.target.closest("[data-path]");
        if (!target) {
            return;
        }

        event.preventDefault();
        const path = target.dataset.path;
        if (!path) {
            return;
        }

        runCommand(`open ${path}`);
        inputShell.focus();
    });

    for (const token of commandTokens) {
        token.addEventListener("click", () => {
            commandBuffer = token.dataset.command || "";
            syncPromptUI();
            inputShell.focus();
        });
    }

    syncPromptUI();
    inputShell.focus();
}

initializeTerminal();
