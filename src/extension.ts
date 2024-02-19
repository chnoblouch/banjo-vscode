import * as vscode from "vscode";
import * as path from "path";
import { LanguageClient, LanguageClientOptions, Executable } from "vscode-languageclient/node";
import { BanjoTaskProvider } from "./taskProvider";

let taskProvider: vscode.Disposable | undefined;
let client: LanguageClient;
let outputChannel: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext) {
    taskProvider = vscode.tasks.registerTaskProvider(BanjoTaskProvider.BanjoType, new BanjoTaskProvider());

    outputChannel = vscode.window.createOutputChannel("Banjo Language Server");
    context.subscriptions.push(outputChannel);

    startServer();

    vscode.workspace.onDidChangeConfiguration(event => {
        if (event.affectsConfiguration("banjo.target")) {
            client.stop();
            startServer();
        }
    })
}

async function startServer() {
    const workspaceConfig = vscode.workspace.getConfiguration("banjo");
    let configURIs = await vscode.workspace.findFiles("**/banjo.json");
    configURIs = configURIs.filter(configURI => path.basename(path.dirname(path.dirname(configURI.path))) != "packages")

    if (configURIs.length == 0) {
        return;
    }

    const configURI = configURIs[0];
    
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
            cwd: path.dirname(configURI.fsPath)
        }
    };

    let clientOptions: LanguageClientOptions = {
        documentSelector: [{ scheme: "file", language: "banjo" }],
        outputChannel: outputChannel,
    };

    client = new LanguageClient(
        "banjoLanguageClient",
        "Banjo Language Client",
        serverOptions,
        clientOptions
    );

    client.start();
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