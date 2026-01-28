/*
  Import Locations from Excel into MongoDB
  Usage:
    npm run import-locations -- --file=Backend/data/locations.xlsx [--sheet=Sheet1]
*/

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');
const Location = require('../models/Location');

dotenv.config();

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

function normalizeHeader(h) {
  return String(h || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z]/g, '');
}

function detectColumns(sheet) {
  const range = xlsx.utils.decode_range(sheet['!ref']);
  let headerRow = range.s.r; // assume first row
  let headerMap = {};

  // Scan first 10 rows to find a likely header row
  for (let r = range.s.r; r <= Math.min(range.s.r + 10, range.e.r); r++) {
    const tempMap = {};
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cellAddress = xlsx.utils.encode_cell({ r, c });
      const cell = sheet[cellAddress];
      const header = cell ? String(cell.v || '').trim() : '';
      const norm = normalizeHeader(header);
      if (norm) tempMap[norm] = c;
    }
    // If we detect likely header keywords, use this row
    const hasDistrictLike = tempMap['district'] || tempMap['dist'] || tempMap['distric'] || tempMap['zilla'] || tempMap['division'];
    const hasTownLike = tempMap['town'] || tempMap['thana'] || tempMap['upazila'] || tempMap['area'] || tempMap['city'];
    if (hasDistrictLike || hasTownLike) {
      headerRow = r;
      headerMap = tempMap;
      break;
    }
  }

  // Fallback: if nothing found, keep initial headerMap from first row
  if (Object.keys(headerMap).length === 0) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cellAddress = xlsx.utils.encode_cell({ r: headerRow, c });
      const cell = sheet[cellAddress];
      const header = cell ? String(cell.v || '').trim() : '';
      const norm = normalizeHeader(header);
      if (norm) headerMap[norm] = c;
    }
  }

  const districtCol = headerMap['district'] || headerMap['dist'] || headerMap['distric'] || headerMap['zilla'] || headerMap['division'];
  const townCol = headerMap['town'] || headerMap['thana'] || headerMap['upazila'] || headerMap['area'] || headerMap['city'];

  return { districtCol, townCol, headerMap, headerRow };
}

function getCellValue(sheet, r, c) {
  const addr = xlsx.utils.encode_cell({ r, c });
  const cell = sheet[addr];
  return cell ? String(cell.v || '').trim() : '';
}

function getDistrictTown(row, fallback) {
  // Try object keys first
  const keys = Object.keys(row);
  const map = {};
  keys.forEach(k => { map[normalizeHeader(k)] = k; });

  const districtKey = map['district'] || map['dist'] || map['distric'] || map['zilla'] || map['division'];
  const townKey = map['town'] || map['thana'] || map['upazila'] || map['area'] || map['city'];

  let district = districtKey ? String(row[districtKey] || '').trim() : '';
  let town = townKey ? String(row[townKey] || '').trim() : '';

  // Fallback to header index detection if object mapping failed
  if ((!district || !town) && fallback && typeof fallback.rowIndex === 'number') {
    const r = fallback.rowIndex;
    const { sheet, districtCol, townCol } = fallback;
    if (districtCol !== undefined) district = district || getCellValue(sheet, r, districtCol);
    if (townCol !== undefined) town = town || getCellValue(sheet, r, townCol);
  }

  return { district, town };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const filePath = args.file;
  const sheetNameArg = args.sheet;
  const districtNameArg = args['district-col'];
  const townNameArg = args['town-col'];
  const districtIndexArg = args['district-index'] !== undefined ? parseInt(args['district-index'], 10) : undefined; // 0-based
  const townIndexArg = args['town-index'] !== undefined ? parseInt(args['town-index'], 10) : undefined; // 0-based
  const dataStartRowArg = args['data-start-row'] !== undefined ? parseInt(args['data-start-row'], 10) : undefined; // 0-based

  if (!filePath) {
    console.error('Missing --file argument.');
    process.exit(1);
  }

  const resolved = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolved)) {
    console.error('File not found:', resolved);
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);

  try {
    const workbook = xlsx.readFile(resolved);
    const sheetName = sheetNameArg || workbook.SheetNames[0];
    if (!workbook.SheetNames.includes(sheetName)) {
      console.error(`Sheet "${sheetName}" not found. Available: ${workbook.SheetNames.join(', ')}`);
      process.exit(1);
    }

    const sheet = workbook.Sheets[sheetName];
    const range = xlsx.utils.decode_range(sheet['!ref']);
    const table = xlsx.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' }); // array-of-arrays

    // Detect header row and columns by scanning first 15 rows unless explicit indices provided
    let headerRow = range.s.r;
    let districtCol = districtIndexArg; // may be undefined
    let townCol = townIndexArg; // may be undefined
    if (districtCol === undefined || townCol === undefined) {
      for (let r = 0; r < Math.min(15, table.length); r++) {
        const row = table[r];
        const candidates = [];
        for (let c = 0; c < row.length; c++) {
          const norm = normalizeHeader(row[c]);
          if (!norm) continue;
          candidates.push({ norm, c, original: row[c] });
        }
        const findByHint = (hint) => candidates.find(h => h.norm.includes(normalizeHeader(hint)))?.c;
        const dColHinted = districtNameArg ? findByHint(districtNameArg) : undefined;
        const tColHinted = townNameArg ? findByHint(townNameArg) : undefined;
        const dCol = districtCol !== undefined ? districtCol : (dColHinted !== undefined
          ? dColHinted
          : candidates.find(h => h.norm.includes('district') || h.norm.includes('zilla') || h.norm.includes('division'))?.c);
        const tCol = townCol !== undefined ? townCol : (tColHinted !== undefined
          ? tColHinted
          : candidates.find(h => h.norm.includes('thana') || h.norm.includes('upazila') || h.norm.includes('town') || h.norm.includes('city') || h.norm.includes('area'))?.c);
        if (dCol !== undefined || tCol !== undefined) {
          headerRow = r;
          districtCol = dCol;
          townCol = tCol;
          break;
        }
      }
    }

    let total = 0, inserted = 0, skipped = 0;

    const startRow = dataStartRowArg !== undefined ? dataStartRowArg : (headerRow + 1);
    for (let r = startRow; r < table.length; r++) {
      const row = table[r] || [];
      total++;
      const district = districtCol !== undefined ? String(row[districtCol] || '').trim() : '';
      const town = townCol !== undefined ? String(row[townCol] || '').trim() : '';
      if (!district || !town) {
        skipped++;
        continue;
      }
      try {
        await Location.updateOne(
          { district, town },
          { $setOnInsert: { district, town } },
          { upsert: true }
        );
        inserted++;
      } catch (err) {
        // Likely duplicate due to race or unique index
      }
    }

    if (inserted === 0) {
      console.log('Debug: No rows inserted. Sample rows:');
      for (let r = startRow; r < Math.min(startRow + 5, table.length); r++) {
        const row = table[r] || [];
        console.log(`Row ${r}:`, row);
      }
      console.log('Detected indices -> districtCol:', districtCol, 'townCol:', townCol, 'startRow:', startRow);
    }

    console.log(`Processed: ${total}, Inserted/Upserted: ${inserted}, Skipped (missing fields): ${skipped}`);
  } catch (err) {
    console.error('Import failed:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

main();
