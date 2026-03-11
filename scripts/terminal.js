const promptForm = document.getElementById("terminalPrompt");
const inputShell = document.getElementById("inputShell");
const promptText = document.getElementById("promptText");
const log = document.getElementById("terminalLog");
const commandTokens = document.querySelectorAll("codeblock[data-command]");

const placeholderText = "Input Command";
const minChars = 12;
const maxChars = 56;
let commandBuffer = "";

function syncPromptUI() {
    const visibleText = commandBuffer || placeholderText;
    const chars = Math.min(maxChars, Math.max(minChars, visibleText.length + 1));
    inputShell.style.width = `${chars}ch`;
    promptText.textContent = visibleText;
    promptText.classList.toggle("promptText--placeholder", commandBuffer.length === 0);
}

function writeLog(text, className = "") {
    const line = document.createElement("p");
    line.className = className;
    line.textContent = text;
    log.appendChild(line);
    log.scrollTop = log.scrollHeight;
}

function runCommand(raw) {
    const command = raw.trim().toLowerCase();
    if (!command) {
        return;
    }

    writeLog(`> ${raw}`, "echo");

    if (command === "help") {
        writeLog("Commands: enter, begin, ui please, help, clear.");
        return;
    }

    if (command === "clear") {
        log.textContent = "";
        return;
    }

    if (command === "enter" || command === "begin") {
        writeLog("Boot sequence ready.");
        return;
    }

    if (command === "ui please") {
        writeLog("Traditional UI route is not wired yet.");
        return;
    }

    if (command === "Test") {
        writeLog("What are you testing? WHY are you testing?")
        return;
    }

    writeLog(`Unknown command: ${command}. Type 'help'.`);
}

function submitBuffer() {
    runCommand(commandBuffer);
    commandBuffer = "";
    syncPromptUI();
}

function handleTyping(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        submitBuffer();
        return;
    }

    if (event.key === "Backspace") {
        event.preventDefault();
        commandBuffer = commandBuffer.slice(0, -1);
        syncPromptUI();
        return;
    }

    if (event.key === "Escape") {
        event.preventDefault();
        commandBuffer = "";
        syncPromptUI();
        return;
    }

    if (event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) {
        return;
    }

    event.preventDefault();
    commandBuffer += event.key;
    syncPromptUI();
}

promptForm.addEventListener("click", () => {
    promptText.innerText = ""
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
    commandBuffer += pastedText.replace(/[\r\n]+/g, " ");
    syncPromptUI();
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
