export function toCsv(rows, columns) {
  const header = columns.join(',');
  const lines = rows.map((row) => columns.map((col) => sanitizeCell(row[col])).join(','));
  return [header, ...lines].join('\n') + '\n';
}

function sanitizeCell(value) {
  if (value === null || value === undefined) return '';
  let str = String(value);
  // Anti formula injection: prefix with ' if starts with dangerous char
  if (/^[=+\-@\t\r]/.test(str)) {
    str = "'" + str;
  }
  // CSV escaping: quote if contains comma, newline, or double-quote
  if (str.includes('"') || str.includes(',') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}
