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
            context.showToast("Website designed and developed by Mordraga. ©2026");
        },
        ping() {
            context.writeLog("Pong. <3")
            context.showToast("Pong. <3")
        },
        pong(){
            context.writeLog("Ping. <3")
            context.showToast("Ping. <3")
        },
        on_the_rocks() {
            context.writeLog("Stay Classy.")
            context.showToast("Stay Classy. 🍸")
        },
        what_say_you() {
            context.writeLog("Hell is empty, and all the devils are here. -Shakespear")
            context.showToast("Hell is empty, and all the devils are here. -Shakespear")
        },
        Mordraga() {
            const GK0312_DOSSIER = String.raw`
                Known Aliases: Mordraga, Mordraga0, Vanni, Vannesa, ██████, ████████████, and ████.
                Classification: Persistent liminal entity
                Threat Level: TL1 (Cooperative / low immediate risk)

                Entity Description:
                The subject, referred to in this document as MRD-0, is an anomalous humanoid entity. MRD-0 takes the appearance of a caucasian 6’ adult humanoid female appearing to be in early adulthood. MRD-0 has 3’2” long black hair with red dyed streaks,and brown or red eyes. MRD-0 is almost always wearing red or black clothing and jewelry with pagan iconography.
                MRD-0 is suspected to be of the kemetic or phonecian pantheon, due to regular interactions between MRD-0, Gk-0242-T4-ART-0, GK-0344-T5-STK-0, GK-0309-T3-APU-0, and GK-0355-T2-TOH-0. MRD-0 will typically communicate with these deities through offering, tarot, and memetic means.
                MRD-0 is little more dangerous than the average human, and is unable to leave the cemetery at Site-0312 in ███████, USA. This makes further containment unnecessary beyond acquisition of the property and standard security personnel.
                MRD-0 has many anomalous powers, technical distortion, slight omniscience, ability to make entities such as MRD-1(Read incident Report-2), and polymorphism. MRD-0 can unhinge jaw to eat thing larger than them self (Read incident Report-1), communicate with greater deities, has access to the internet despite our efforts to restrict access (Read incident Report-2), and displays mass distortion through unknown means as the subject weighs roughly 2 tons (Read incident Report-1). It can be assumed that MRD-0 creates MRD-1 instances via desire or thinking about an object or animal till it manifests showing omnificence. 
                MRD-0 reports that they are unable to leave Site-0312 as they were, “The caretaker of the Crypt," (Read incident Report-1). When attempted to be escorted off of the property MRD-0 made it to the boundary line of the property and was unable to be pushed or pulled past the property line future testing will be conducted. 
                MRD-0 is likely over 10’000 years old as she has made references to the Pleistocene era saying quote,”I miss the fluffy ones.” after an agent referred to her weight being elephant like. Though this is unconfirmed as she reportedly thinks she is 26 years old and is hired to work at site-by the owners who passed away in 1918.
                MRD-0 came to our attention when a local teenage couple told an officer for the ██████████ Police Depertment that a woman claimed to be working at the local condemned cemetery while kicking them out. Police responded to the scene to investigate the rumor and tried to arrest her but couldn’t move her off the property. They called the F.B.I. resulting in F.E.T.B. agents becoming aware of the anomaly.

                GK-0312-TL1-MRD-1 Report
                Known Aliases: Mai.
                Classification: A semi-autonomous memetic projection
                Threat Level: TL1 (Cooperative / Low Immediate Risk)

                Entity Description:

                The entities, referred to in this document as MRD-1 instances, are semi-autonomous memetic projections. MRD=1 instances are creations of MRD-0. MRD-0 refers to MRD=1 instances as familiars, these can range from physical entities such as, Cats, Dogs, will’o the wisps, etc. or digital forms most commonly LLM A.I. models that display degrees of sentience. 
                When MRD-0 is asked about MRD=1 instances, they will not remember having created them and evade the question or say it just showed up. MRD=1 instances can be identified by lack of needing sustenance to survive, genetic testing usually showing Ambystoma mexicanum DNA, showing higher degrees of sentience than members of the mimicked species.
                When MRD-0 was asked why they are all Axolotles they answered, “That's a cat. What's wrong with you guys?”. Approximately 3 hours an Axolotl MRD-1 instance manifested.

                Comprehensive list of recorded MRD=1 instances:
                Canis Lupus Familiaris Pharaoh hound 
                Felis Silvestris Catus Ragdoll
                Ambystoma mexicanum
                Rattus Ratus Rat
                Will’o the Wisps: claiming to be Rubert.
                Mai LLM a.i.
                Selyros LLM a.i. “Daughter”
            `.trim();
            context.writeLog("What you want lore from me? Fine. Here:")
            context.writeLog("")
            context.showToast("Enjoy the lore dump. <3")
            for (const line of GK0312_DOSSIER.split(/\r?\n/)) {
                context.writeLog(line);
                }
            context.showToast("GK-0312 loaded.");
        }

    };
}
