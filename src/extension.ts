// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import paths = require('path');
import * as fs from 'fs';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	let sel: vscode.DocumentSelector = { scheme: 'file',language: 'lua' };
	let disposable2 = vscode.languages.registerDocumentLinkProvider(sel, new DocumentLinkProvider());
    context.subscriptions.push(disposable2)
    
}

// this method is called when your extension is deactivated
export function deactivate() {}


let basepath = vscode.workspace.rootPath;
let pattern = /(?:[\\s^\W])((?:[A-Z](?:[a-zA-Z]+))(?=[.:(]))+/g

export class DocumentLinkProvider implements vscode.DocumentLinkProvider {

    public read(folder: string): {} {
        
        let paths = {}
        let files = fs.readdirSync(folder)
        files.forEach(path => {
            let fullPath = folder + "/" + path
            if (!fs.lstatSync(fullPath).isDirectory()) {
                paths[path] = fullPath
            }
            else if (path.substr(0, 1) != ".") {
                let red = this.read(fullPath)
                Object.keys(red).forEach(k => {
                    paths[k] = red[k]
                })
            }
        });
        return paths
    }

    public provideDocumentLinks(doc: vscode.TextDocument, token: vscode.CancellationToken): vscode.ProviderResult<vscode.DocumentLink[]> {
		let documentLinks: vscode.ProviderResult<vscode.DocumentLink[]> = [];
        let line_idx = 0;

        let fileMap = this.read(basepath);

        while (line_idx < doc.lineCount) {
            let line = doc.lineAt(line_idx);
            var result = pattern.exec(line.text)
            while (result != null) {
                
                let fileName = result[1] + ".lua";
                let path = fileMap[fileName]
                if (path != null && doc.fileName != path) {
                    let start = result.index + (result[0].length - result[1].length)
                    let uri = vscode.Uri.file(path);
                    let range = new vscode.Range(line_idx, start , line_idx, start + result[1].length );
                    let documentlink = new vscode.DocumentLink(range, uri.with({ fragment: result[1] }));
                    documentLinks.push(documentlink);
                }

                result = pattern.exec(line.text)
            }
                
            line_idx++;
        }
        return documentLinks;
	}
	
	
}