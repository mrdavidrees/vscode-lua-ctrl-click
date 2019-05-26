// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import paths = require('path');
import * as fs from 'fs';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	if (basepath === undefined) {
		return;
	}

	let sel: vscode.DocumentSelector = { scheme: 'file', language: 'lua' };
	context.subscriptions.push(
		vscode.languages.registerDocumentLinkProvider(
			sel,
			new DocumentLinkProvider()
		)
	);

	let fileSystemWatcher = vscode.workspace.createFileSystemWatcher(
		'**/*.lua',
		false,
		true,
		false
	);
	context.subscriptions.push(
		fileSystemWatcher.onDidCreate(filePath => {
			// console.log(filePath + " create!");
			fileMap = readFileMap(basepath);
		})
	);
	context.subscriptions.push(
		fileSystemWatcher.onDidDelete(filePath => {
			// console.log(filePath + " delete!");
			fileMap = readFileMap(basepath);
		})
	);

	fileMap = readFileMap(basepath);

	// https://github.com/davidhewitt/shebang-language-associator/blob/master/src/extension.ts

	/*
	 * Any files open on startup need to have shebang checked.
	 */
	checkAllFiles();

	/*
	 * Re-check when configuration changes.
	 */
	let disposable = vscode.workspace.onDidChangeConfiguration(checkAllFiles);
	context.subscriptions.push(disposable);

	/*
	 * And also when further files are opened we will check them.
	 */
	disposable = vscode.workspace.onDidOpenTextDocument(checkFile);
	context.subscriptions.push(disposable);

	disposable = vscode.workspace.onDidSaveTextDocument(checkFile);
	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}

function readFileMap(folder: string): {} {
	let paths = {};
	let files = fs.readdirSync(folder);
	files.forEach(path => {
		let fullPath = folder + '/' + path;
		if (!fs.lstatSync(fullPath).isDirectory()) {
			paths[path] = fullPath;
		} else if (path.substr(0, 1) != '.') {
			let red = readFileMap(fullPath);
			Object.keys(red).forEach(k => {
				paths[k] = red[k];
			});
		}
	});
	return paths;
}

var fileMap = {};
let basepath = vscode.workspace.rootPath;
let pattern = /(?:[\\s^\W])((?:[A-Z](?:[a-zA-Z]+))(?=[.:(]))+/g;

export class DocumentLinkProvider implements vscode.DocumentLinkProvider {
	public provideDocumentLinks(
		doc: vscode.TextDocument,
		token: vscode.CancellationToken
	): vscode.ProviderResult<vscode.DocumentLink[]> {
		let documentLinks: vscode.ProviderResult<vscode.DocumentLink[]> = [];
		let line_idx = 0;

		while (line_idx < doc.lineCount) {
			let line = doc.lineAt(line_idx);
			var result = pattern.exec(line.text);
			while (result != null) {
				let fileName = result[1] + '.lua';
				let path = fileMap[fileName];
				if (path != null && doc.fileName != path) {
					let start =
						result.index + (result[0].length - result[1].length);
					let uri = vscode.Uri.file(path);
					let range = new vscode.Range(
						line_idx,
						start,
						line_idx,
						start + result[1].length
					);
					let documentlink = new vscode.DocumentLink(
						range,
						uri.with({ fragment: result[1] })
					);
					documentLinks.push(documentlink);
				}

				result = pattern.exec(line.text);
			}

			line_idx++;
		}
		return documentLinks;
	}
}

/**
 * Re-check all open files
 */
function checkAllFiles() {
	for (const td of vscode.workspace.textDocuments) {
		checkFile(td);
	}
}

/**
 * Check whether a file has a matching shebang, and apply the appropriate
 * language mode if so.
 */
function checkFile(doc: vscode.TextDocument) {
	let shebang = doc.lineAt(0);

	// skip files with extensions
	if (!/^[^.]+$/.test(paths.basename(doc.fileName))) {
		return;
	}

	let associations = vscode.workspace
		.getConfiguration('lua-ctrl-click')
		.get<Array<any>>('associations');

	if (associations) {
		for (const association of associations) {
			if (shebang.text.match(new RegExp(association.pattern))) {
				vscode.languages.setTextDocumentLanguage(
					doc,
					association.language
				);
				break;
			}
		}
	}
}
