import * as vscode from "vscode";
import * as path from "path";

interface BanjoTaskDefinition extends vscode.TaskDefinition {
    command: string;
};

export class BanjoTaskProvider implements vscode.TaskProvider {
    static BanjoType = "banjo";

    provideTasks(token: vscode.CancellationToken): vscode.ProviderResult<vscode.Task[]> {
        const kind: BanjoTaskDefinition = { type: "banjo", command: "build" };
        const scope = vscode.TaskScope.Workspace;
        const name = "build";
        const execution = new vscode.ShellExecution(`banjo build`);
        const task = new vscode.Task(kind, scope, name, "banjo", execution);
        return [task];
    }
    
    resolveTask(_task: vscode.Task, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Task> {
        const command = _task.definition.command;
        if(command) {
            const definition = _task.definition;
            const scope = _task.scope ?? vscode.TaskScope.Workspace;
            const execution = new vscode.ShellExecution(`banjo ${command}`);
            return new vscode.Task(definition, scope, definition.command, "banjo", execution);
        }

        return undefined;
    }

}