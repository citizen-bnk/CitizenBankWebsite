const ts = require('typescript');
const path = require('node:path');
const config = ts.readConfigFile('tsconfig.json', ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, process.cwd());
const program = ts.createProgram(parsed.fileNames, parsed.options);
let failures = 0;
for (const diagnostic of program.getSemanticDiagnostics()) {
  if (![2304,2552].includes(diagnostic.code) || !diagnostic.file || !diagnostic.file.fileName.replaceAll('\\','/').includes('/src/')) continue;
  // Vite erases types. Check unresolved identifiers that remain in executable code.
  let node = diagnostic.file;
  while (true) {
    const child = node.getChildren().find(n => n.pos <= diagnostic.start && n.end > diagnostic.start);
    if (!child) break;
    node = child;
  }
  let typeOnly = false;
  for (let parent = node; parent && !ts.isStatement(parent); parent = parent.parent) {
    if (ts.isTypeNode(parent)) { typeOnly = true; break; }
  }
  if (typeOnly) continue;
  const position = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
  console.error(`${path.relative(process.cwd(),diagnostic.file.fileName)}:${position.line+1} ${ts.flattenDiagnosticMessageText(diagnostic.messageText,' ')}`);
  failures++;
}
if (failures) process.exitCode = 1;
else console.log('No undefined runtime identifiers in application source.');
