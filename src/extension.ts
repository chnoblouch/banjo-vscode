import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { LanguageClient, LanguageClientOptions, Executable } from "vscode-languageclient/node";
import { BanjoTaskProvider } from "./taskProvider";

let taskProvider: vscode.Disposable | undefined;
let client: LanguageClient | null;
let outputChannel: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext) {
    taskProvider = vscode.tasks.registerTaskProvider(BanjoTaskProvider.BanjoType, new BanjoTaskProvider());

    outputChannel = vscode.window.createOutputChannel("Banjo");
    context.subscriptions.push(outputChannel);

    startServer();

    vscode.workspace.onDidChangeConfiguration(event => {
        if (event.affectsConfiguration("banjo.projectFile") || event.affectsConfiguration("banjo.target")) {
            restartServer();
        }
    })
}

async function startServer() {
    const workspaceConfig = vscode.workspace.getConfiguration("banjo")
    const configPath = workspaceConfig.get<string>("projectFile");
    const configFullPath = path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, configPath);

    try {
        const configURI = vscode.Uri.file(configFullPath);
        await vscode.workspace.fs.stat(configURI);
    } catch (e) {
        client = null;
        vscode.window.showErrorMessage(`Banjo error: project file '${configPath}' does not exist`)
        return;
    }

    let target = workspaceConfig.get<string>("target");
    let arch = "x86_64";
    let os = "windows";

    if (target !== null) {
        let elements = target.split('-')
        arch = elements[0]
        os = elements[1]
    }

    let serverOptions: Executable = {
        command: "banjo-lsp",
        args: [
            "--arch", arch,
            "--os", os
        ],
        options: {
            cwd: path.dirname(configFullPath)
        }
    };

    let clientOptions: LanguageClientOptions = {
        documentSelector: [{ scheme: "file", language: "banjo" }],
        outputChannel: outputChannel,
    };

    client = new LanguageClient(
        "banjoLanguageClient",
        "Banjo",
        serverOptions,
        clientOptions
    );

    client.start();
}

async function restartServer() {
    if (client != null) {
        client.stop();
    }

    startServer();
}

export function deactivate(): Thenable<void> | undefined {
    if (taskProvider) {
        taskProvider.dispose();
    }

    if (!client) {
        return undefined;
    }
    return client.stop();
}