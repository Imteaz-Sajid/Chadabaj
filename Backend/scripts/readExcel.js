/*
  Excel Reader Script
  Usage:
    npm run read-excel -- --file=path/to/file.xls[|xlsx] [--sheet=Sheet1]
    npm run read-excel -- --help
*/

const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token.startsWith('--')) {
      const [key, val] = token.split('=');
      const name = key.replace(/^--/, '');
      if (val !== undefined) {
        args[name] = val;
      } else {
        const next = argv[i + 1];
        if (next && !next.startsWith('--')) {
          args[name] = next;
          i++;
        } else {
          args[name] = true;
        }
      }
    }
  }
  return args;
}

function printHelp() {
  console.log(`\nExcel Reader\n-------------\nUsage:\n  npm run read-excel -- --file=path/to/file.xls[|xlsx] [--sheet=Sheet Name]\n\nOptions:\n  --file     Required. Path to the Excel file (.xls or .xlsx)\n  --sheet    Optional. Sheet name to read (defaults to first sheet)\n\nOutput:\n  Prints JSON to stdout with rows parsed from the sheet.\n`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.h) {
    printHelp();
    process.exit(0);
  }

  const filePath = args.file;
  if (!filePath) {
    console.error('Error: Missing --file argument.');
    printHelp();
    process.exit(1);
  }

  const resolved = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolved)) {
    console.error(`Error: File not found at ${resolved}`);
    process.exit(1);
  }

  try {
    const workbook = xlsx.readFile(resolved);
    const sheetName = args.sheet || workbook.SheetNames[0];
    if (!workbook.SheetNames.includes(sheetName)) {
      console.error(`Error: Sheet "${sheetName}" not found. Available: ${workbook.SheetNames.join(', ')}`);
      process.exit(1);
    }
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { defval: null });
    const output = { file: resolved, sheet: sheetName, count: rows.length, rows };
    console.log(JSON.stringify(output, null, 2));
  } catch (err) {
    console.error('Failed to parse Excel file:', err.message);
    process.exit(1);
  }
}

main();
