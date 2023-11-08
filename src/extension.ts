import * as vscode from "vscode";
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

function startServer() {
    let workspaceConfig = vscode.workspace.getConfiguration("banjo");
    const configURI = vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, "banjo.json");

    vscode.workspace.openTextDocument(configURI).then((document) => {
        const config = JSON.parse(document.getText());
        const mainModule = config["main_module"];

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
                "--main-module", mainModule,
                "--arch", arch,
                "--os", os
            ]
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
    });
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