import * as vscode from 'vscode';
import * as path from 'path';
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from 'vscode-languageclient/node';
import { DocumentSymbol } from 'vscode-languageserver-types';

export async function activate(context: vscode.ExtensionContext) {
    // Language client configuration
    const serverOptions: ServerOptions = {
        command: path.join(context.extensionPath, 'omnisharp', 'OmniSharp.exe'),
        args: ['--languageserver'],
        transport: TransportKind.stdio
    };

    const clientOptions: LanguageClientOptions = {
        documentSelector: [{ scheme: 'file', language: 'csharp' }]
    };

    const languageClient = new LanguageClient('CSharp', 'C# Language Server', serverOptions, clientOptions);
    // Start the language client and wait for it to be ready
    await languageClient.start();

    // Add the languageClient to context.subscriptions
    context.subscriptions.push(languageClient);

    let disposable = vscode.commands.registerCommand('extension.generateNUnitBoilerplate', async () => {
        const editor = vscode.window.activeTextEditor;

        if (!editor) {
            vscode.window.showErrorMessage('Please open a C# file to generate NUnit boilerplate code.');
            return;
        }

        const document = editor.document;
        if (document.languageId !== 'csharp') {
            vscode.window.showErrorMessage('Please open a C# file to generate NUnit boilerplate code.');
            return;
        }

        const symbols: DocumentSymbol[] = await languageClient.sendRequest('textDocument/documentSymbol', {
            textDocument: {
                uri: document.uri.toString()
            }
        });

        const classSymbol = symbols.find(symbol => symbol.kind === vscode.SymbolKind.Class);

        if (!classSymbol) {
            vscode.window.showErrorMessage('No class found in the current file.');
            return;
        }

        const className = classSymbol.name;
        let constructorParams: string[] = [];

        if (classSymbol.children) {
            const constructorSymbol = classSymbol.children.find(child => child.kind === vscode.SymbolKind.Constructor);

            if (constructorSymbol) {
                const start = new vscode.Position(constructorSymbol.range.start.line, constructorSymbol.range.start.character);
                const end = new vscode.Position(constructorSymbol.range.end.line, constructorSymbol.range.end.character);
                const constructorSignature = document.getText(new vscode.Range(start, end));

                const paramsRegex = /\(([^)]+)\)/;
                const paramsMatch = constructorSignature.match(paramsRegex);

                if (paramsMatch && paramsMatch[1]) {
                    constructorParams = paramsMatch[1].split(',').map(param => param.trim().split(' ')[0]);
                }
            }
        }

        const boilerplate = generateNUnitBoilerplate(className, constructorParams);

        const testFileName = `${document.fileName.slice(0, -3)}Tests.cs`;
        const testFileUri = vscode.Uri.file(testFileName);

        try {
            await vscode.workspace.fs.writeFile(testFileUri, Buffer.from(boilerplate, 'utf8'));
            const testDocument = await vscode.workspace.openTextDocument(testFileUri);
            await vscode.window.showTextDocument(testDocument);
        } catch (error) {
            vscode.window.showErrorMessage('Failed to create the test file.');
            console.error(error);
        }
    });

    context.subscriptions.push(disposable);
}

function generateNUnitBoilerplate(className: string, constructorParams: string[]): string {
    const instanceName = className.charAt(0).toLowerCase() + className.slice(1);
    const dependencies = constructorParams.join(', ');
    const mocks = constructorParams.map(param => `private Mock<${param}> _${param}Mock;`).join('\n');
    const mockInitializations = constructorParams.map(param => `_${param}Mock = new Mock<${param}>();`).join('\n');

    return `
using NUnit.Framework;
using Moq;

namespace YourNamespace
{
    [TestFixture]
    public class ${className}Tests
    {
        private ${className} ${instanceName};
        ${mocks}

        [SetUp]
        public void Setup()
        {
            ${mockInitializations}
            ${instanceName} = new ${className}(${dependencies});
        }

        // Add your test methods here
    }
}`;
}




// This method is called when your extension is deactivated
export function deactivate() { }
