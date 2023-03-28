import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';


export function activate(context: vscode.ExtensionContext) {
	let disposable = vscode.commands.registerCommand('extension.generateNUnitBoilerplate', async () => {
		const editor = vscode.window.activeTextEditor;
		if (editor) {
			const document = editor.document;
			const className = path.basename(document.fileName, '.cs');
			const testClassName = className + 'Tests';
			const testFilePath = path.join(path.dirname(document.fileName), testClassName + '.cs');

			if (fs.existsSync(testFilePath)) {
				vscode.window.showErrorMessage('Test file already exists.');
				return;
			}

			const boilerplate = generateNUnitBoilerplate(className, testClassName);
			fs.writeFileSync(testFilePath, boilerplate);

			vscode.window.showInformationMessage('NUnit boilerplate file created.');
			const openPath = vscode.Uri.file(testFilePath);
			await vscode.workspace.openTextDocument(openPath);
		}
	});

	context.subscriptions.push(disposable);
}


function generateNUnitBoilerplate(className: string, testClassName: string): string {
	return `using NUnit.Framework;
using Moq;
using System;

namespace Tests
{
[TestFixture]
public class ${testClassName}

{
    private ${className} _${className};
    // Add private variables for each mock here

    [SetUp]
    public void Setup()
    {
        // Initialize your mocks here
        // var mockDependency1 = new Mock<IDependency1>();

        _${className} = new ${className}(); // Pass your mock dependencies here
    }

    [Test]
    public void TestMethod1()
    {
        // Arrange
        // Set up any necessary mock behavior here
        // mockDependency1.Setup(...);

        // Act
        // Call the method to be tested on _${className} and store the result, if any
        // var result = _${className}.MethodToTest();

        // Assert
        // Verify the expected result or behavior
        // Assert.AreEqual(expectedResult, result);
        // mockDependency1.Verify(...);
    }

    // Add more test methods here
}
}`;
}

// This method is called when your extension is deactivated
export function deactivate() { }
