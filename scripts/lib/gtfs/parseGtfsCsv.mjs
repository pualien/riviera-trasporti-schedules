function stripBom(value) {
  return String(value ?? '').replace(/^\uFEFF/, '');
}

function parseRows(input) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
        continue;
      }

      if (char === '"') {
        quoted = false;
        continue;
      }

      field += char;
      continue;
    }

    if (char === '"') {
      quoted = true;
      continue;
    }

    if (char === ',') {
      row.push(field);
      field = '';
      continue;
    }

    if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      continue;
    }

    if (char === '\r') {
      continue;
    }

    field += char;
  }

  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }

  if (quoted) {
    throw new Error('CSV input ended inside a quoted field');
  }

  return rows.filter((entry) => entry.some((fieldValue) => fieldValue !== ''));
}

export function parseGtfsCsv(input) {
  const rows = parseRows(stripBom(input));
  const [headers, ...records] = rows;

  if (!headers?.length) {
    return [];
  }

  return records.map((record, index) => {
    if (record.length !== headers.length) {
      throw new Error(`CSV row ${index + 2} has ${record.length} fields; expected ${headers.length}`);
    }

    return Object.fromEntries(headers.map((header, headerIndex) => [header, record[headerIndex]]));
  });
}
