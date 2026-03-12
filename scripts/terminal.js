import { createCommandHandlers } from "./command-handlers.js";
import { defaultCommandCatalog, loadCommandCatalog, parseCommandInput } from "./commands.js";
import { createPortfolioFS } from "./portfolio-fs.js";

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
const redirectPromptMessage = "Hey! You are being redirected from LiminalWitch.CV. Continue?";
let commandBuffer = "";
let commandCatalog = defaultCommandCatalog;
const portfolioFs = createPortfolioFS();
const commandHistory = [];
let historyIndex = 0;
let historyDraft = "";
let renderQueue = Promise.resolve();
let renderEpoch = 0;
let activeRedirectPrompt = null;

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

function getHostLabel(href) {
    const normalizedHref = normalizeExternalHref(href);
    try {
        return new URL(normalizedHref).host;
    } catch {
        return normalizedHref;
    }
}

function normalizeExternalHref(href) {
    const rawHref = String(href ?? "").trim();
    if (!rawHref) {
        return "";
    }

    if (/^[a-z][a-z0-9+.-]*:/i.test(rawHref)) {
        return rawHref;
    }

    return `https://${rawHref}`;
}

function showRedirectPrompt(href) {
    return new Promise((resolve) => {
        if (activeRedirectPrompt) {
            activeRedirectPrompt.resolve(false);
            activeRedirectPrompt.element.remove();
            activeRedirectPrompt = null;
        }

        const toast = document.createElement("div");
        toast.className = "redirectToast";
        toast.setAttribute("role", "alertdialog");
        toast.setAttribute("aria-live", "assertive");

        const message = document.createElement("p");
        message.className = "redirectToast__message";
        message.textContent = redirectPromptMessage;

        const destination = document.createElement("p");
        destination.className = "redirectToast__destination";
        destination.textContent = `Destination: ${getHostLabel(href)}`;

        const actions = document.createElement("div");
        actions.className = "redirectToast__actions";

        const agreeButton = document.createElement("button");
        agreeButton.type = "button";
        agreeButton.className = "redirectToast__button";
        agreeButton.textContent = "Agree";

        const cancelButton = document.createElement("button");
        cancelButton.type = "button";
        cancelButton.className = "redirectToast__button redirectToast__button--subtle";
        cancelButton.textContent = "Cancel";

        const closePrompt = (approved) => {
            if (!activeRedirectPrompt) {
                return;
            }
            const { element, resolve: resolvePrompt } = activeRedirectPrompt;
            activeRedirectPrompt = null;
            element.classList.remove("is-visible");
            window.setTimeout(() => element.remove(), 160);
            resolvePrompt(approved);
        };

        agreeButton.addEventListener("click", () => closePrompt(true));
        cancelButton.addEventListener("click", () => closePrompt(false));

        actions.appendChild(agreeButton);
        actions.appendChild(cancelButton);
        toast.appendChild(message);
        toast.appendChild(destination);
        toast.appendChild(actions);

        document.body.appendChild(toast);
        window.requestAnimationFrame(() => toast.classList.add("is-visible"));
        activeRedirectPrompt = { element: toast, resolve };
    });
}

function easterEggToast(text = "Easter egg unlocked.") {
    const toast = document.createElement("div");
    toast.className = "redirectToast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");

    const message = document.createElement("p");
    message.className = "redirectToast__message";
    message.textContent = text;

    toast.appendChild(message);
    document.body.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add("is-visible"));
    setTimeout(() => {
        toast.classList.remove("is-visible");
        setTimeout(() => toast.remove(), 160);
    }, 2200);
}


async function openExternalWithPrompt(href) {
    const normalizedHref = normalizeExternalHref(href);
    if (!normalizedHref) {
        writeLog("Invalid redirect target.");
        return;
    }

    const approved = await showRedirectPrompt(normalizedHref);
    if (!approved) {
        writeLog("Redirect cancelled.");
        return;
    }

    window.open(normalizedHref, "_blank", "noopener,noreferrer");
    writeLog(`Redirecting to ${getHostLabel(normalizedHref)}...`);
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
            token.dataset.href = part.href;
            token.textContent = part.label ?? part.href;
            line.appendChild(token);
        }
    }

    enqueueLine(line, estimateRichLength(parts));
}

let activeToast = null;

function showToast(text, durationMs = 1800) {
    const messageText = String(text ?? "").trim();
    if (!messageText) {
        return;
    }

    if (activeToast) {
        activeToast.remove();
        activeToast = null;
    }

    const toast = document.createElement("div");
    toast.className = "redirectToast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");

    const message = document.createElement("p");
    message.className = "redirectToast__message";
    message.textContent = messageText;

    toast.appendChild(message);
    document.body.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add("is-visible"));

    window.setTimeout(() => {
        toast.classList.remove("is-visible");
        window.setTimeout(() => {
            toast.remove();
            if (activeToast === toast) {
                activeToast = null;
            }
        }, 160);
    }, durationMs);

    activeToast = toast;
}

const commandHandlers = createCommandHandlers({
    fs: portfolioFs,
    writeLog,
    writeRichLog,
    showToast,
    clearLog: () => {
        renderEpoch += 1;
        renderQueue = Promise.resolve();
        log.textContent = "";
    },
    getCatalog: () => commandCatalog,
    openExternal: (href) => {
        openExternalWithPrompt(href);
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
    await portfolioFs.loadEntries();
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
        const linkTarget = event.target.closest(".terminalToken--link");
        if (linkTarget) {
            event.preventDefault();
            const href = linkTarget.dataset.href || linkTarget.getAttribute("href");
            if (href) {
                openExternalWithPrompt(href);
            }
            inputShell.focus();
            return;
        }

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
