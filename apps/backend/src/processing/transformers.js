/**
 * Data Transformation Module
 * Transforms raw CSV data into normalized format for database storage
 */

const { normalizeColumnName } = require('./validators');

// Month names lookup (centralized to avoid duplication)
const MONTH_NAMES = {
  'jan': 1, 'january': 1,
  'feb': 2, 'february': 2,
  'mar': 3, 'march': 3,
  'apr': 4, 'april': 4,
  'may': 5,
  'jun': 6, 'june': 6,
  'jul': 7, 'july': 7,
  'aug': 8, 'august': 8,
  'sep': 9, 'september': 9, 'sept': 9,
  'oct': 10, 'october': 10,
  'nov': 11, 'november': 11,
  'dec': 12, 'december': 12
};

/**
 * Parse date string to Date object
 * Supports multiple date formats and automatically detects format
 * @param {string} dateStr 
 * @returns {Date|null}
 */
function parseDate(dateStr) {
  if (!dateStr || dateStr.trim() === '') {
    return null;
  }

  const str = dateStr.trim();

  // Try multiple date parsing strategies
  const strategies = [
    // Strategy 1: DD-MM-YYYY format (e.g., 24-12-2024, 1-1-2024)
    () => {
      const match = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
      if (match) {
        const [, day, month, year] = match;
        const d = parseInt(day), m = parseInt(month), y = parseInt(year);
        if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 1900 && y <= 2100) {
          return new Date(Date.UTC(y, m - 1, d));
        }
      }
      return null;
    },

    // Strategy 2: DD/MM/YYYY format (e.g., 24/12/2024, 1/1/2024)
    () => {
      const match = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (match) {
        const [, day, month, year] = match;
        const d = parseInt(day), m = parseInt(month), y = parseInt(year);
        if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 1900 && y <= 2100) {
          return new Date(Date.UTC(y, m - 1, d));
        }
      }
      return null;
    },

    // Strategy 3: YYYY-MM-DD format (ISO format)
    () => {
      const match = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      if (match) {
        const [, year, month, day] = match;
        const d = parseInt(day), m = parseInt(month), y = parseInt(year);
        if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 1900 && y <= 2100) {
          return new Date(Date.UTC(y, m - 1, d));
        }
      }
      return null;
    },

    // Strategy 4: DD-MMM-YY format (e.g., 09-Jan-26, 24-Dec-25) - 2-digit year - PRIORITY
    () => {
      const match = str.match(/^(\d{1,2})-([a-zA-Z]+)-(\d{2})$/);
      if (match) {
        const [, day, monthStr, yearStr] = match;
        const d = parseInt(day);
        const m = MONTH_NAMES[monthStr.toLowerCase()];
        let y = parseInt(yearStr);
        
        if (!m) return null;
        
        // Convert 2-digit year to 4-digit year
        // Assume 00-49 = 2000-2049, 50-99 = 1950-1999
        if (y <= 49) {
          y += 2000;
        } else {
          y += 1900;
        }
        
        if (d >= 1 && d <= 31 && y >= 1900 && y <= 2100) {
          return new Date(Date.UTC(y, m - 1, d));
        }
      }
      return null;
    },

    // Strategy 5: DD MMM YY format (e.g., 24 Dec 24, 1 Jan 26) - 2-digit year
    () => {
      const match = str.match(/^(\d{1,2})\s+([a-zA-Z]+)\s+(\d{2})$/);
      if (match) {
        const [, day, monthStr, yearStr] = match;
        const d = parseInt(day);
        const m = MONTH_NAMES[monthStr.toLowerCase()];
        let y = parseInt(yearStr);
        
        if (!m) return null;
        
        if (y <= 49) {
          y += 2000;
        } else {
          y += 1900;
        }
        
        if (d >= 1 && d <= 31 && y >= 1900 && y <= 2100) {
          return new Date(Date.UTC(y, m - 1, d));
        }
      }
      return null;
    },

    // Strategy 6: DD/MM/YY format (e.g., 24/12/24, 1/1/26) - 2-digit year
    () => {
      const match = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
      if (match) {
        const [, day, month, yearStr] = match;
        const d = parseInt(day), m = parseInt(month);
        let y = parseInt(yearStr);
        
        if (y <= 49) {
          y += 2000;
        } else {
          y += 1900;
        }
        
        if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 1900 && y <= 2100) {
          return new Date(Date.UTC(y, m - 1, d));
        }
      }
      return null;
    },

    // Strategy 7: DD-MM-YY format (e.g., 24-12-24, 1-1-26) - 2-digit year
    () => {
      const match = str.match(/^(\d{1,2})-(\d{1,2})-(\d{2})$/);
      if (match) {
        const [, day, month, yearStr] = match;
        const d = parseInt(day), m = parseInt(month);
        let y = parseInt(yearStr);
        
        if (y <= 49) {
          y += 2000;
        } else {
          y += 1900;
        }
        
        if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 1900 && y <= 2100) {
          return new Date(Date.UTC(y, m - 1, d));
        }
      }
      return null;
    },

    // Strategy 8: DD-MMM-YYYY format (e.g., 24-Dec-2024) - 4-digit year
    () => {
      const match = str.match(/^(\d{1,2})-([a-zA-Z]+)-(\d{4})$/);
      if (match) {
        const [, day, monthStr, year] = match;
        const d = parseInt(day), y = parseInt(year);
        const m = MONTH_NAMES[monthStr.toLowerCase()];
        
        if (!m) return null;
        
        if (d >= 1 && d <= 31 && y >= 1900 && y <= 2100) {
          return new Date(Date.UTC(y, m - 1, d));
        }
      }
      return null;
    },

    // Strategy 9: DD MMM YYYY format (e.g., 24 Dec 2024) - 4-digit year
    () => {
      const match = str.match(/^(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})$/);
      if (match) {
        const [, day, monthStr, year] = match;
        const d = parseInt(day), y = parseInt(year);
        const m = MONTH_NAMES[monthStr.toLowerCase()];
        
        if (!m) return null;
        
        if (d >= 1 && d <= 31 && y >= 1900 && y <= 2100) {
          return new Date(Date.UTC(y, m - 1, d));
        }
      }
      return null;
    },

    // Strategy 10: DD.MM.YYYY format (European dot format)
    () => {
      const match = str.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
      if (match) {
        const [, day, month, year] = match;
        const d = parseInt(day), m = parseInt(month), y = parseInt(year);
        if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 1900 && y <= 2100) {
          return new Date(Date.UTC(y, m - 1, d));
        }
      }
      return null;
    },

    // Strategy 11: YYYY/MM/DD format
    () => {
      const match = str.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
      if (match) {
        const [, year, month, day] = match;
        const d = parseInt(day), m = parseInt(month), y = parseInt(year);
        if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 1900 && y <= 2100) {
          return new Date(Date.UTC(y, m - 1, d));
        }
      }
      return null;
    },

    // Strategy 12: MMM DD, YYYY format (e.g., Dec 24, 2024)
    () => {
      const match = str.match(/^([a-zA-Z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
      if (match) {
        const [, monthStr, day, year] = match;
        const d = parseInt(day), y = parseInt(year);
        const m = MONTH_NAMES[monthStr.toLowerCase()];
        
        if (!m) return null;
        
        if (d >= 1 && d <= 31 && y >= 1900 && y <= 2100) {
          return new Date(Date.UTC(y, m - 1, d));
        }
      }
      return null;
    },

    // Strategy 13: YYYYMMDD format (compact format)
    () => {
      const match = str.match(/^(\d{4})(\d{2})(\d{2})$/);
      if (match) {
        const [, year, month, day] = match;
        const d = parseInt(day), m = parseInt(month), y = parseInt(year);
        if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 1900 && y <= 2100) {
          return new Date(Date.UTC(y, m - 1, d));
        }
      }
      return null;
    },

    // Strategy 14: MM/DD/YYYY format (US format)
    () => {
      const match = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (match) {
        const [, month, day, year] = match;
        const d = parseInt(day), m = parseInt(month), y = parseInt(year);
        if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 1900 && y <= 2100 && d > 12) {
          return new Date(Date.UTC(y, m - 1, d));
        }
      }
      return null;
    },

    // Strategy 15: JavaScript Date.parse() as fallback
    () => {
      try {
        const parsed = new Date(str);
        if (!isNaN(parsed.getTime()) && parsed.getFullYear() >= 1900 && parsed.getFullYear() <= 2100) {
          return new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()));
        }
      } catch (e) {
        // Ignore
      }
      return null;
    }
  ];

  // Try each strategy until one succeeds
  for (const strategy of strategies) {
    const result = strategy();
    if (result) {
      return result;
    }
  }

  return null;
}

/**
 * Parse numeric value with fallback
 * @param {any} value 
 * @param {number} defaultValue 
 * @returns {number}
 */
function parseNumber(value, defaultValue = 0) {
  if (value === null || value === undefined || value === '') {
    return defaultValue;
  }
  
  const cleaned = String(value).replace(/,/g, '').trim();
  const num = parseFloat(cleaned);
  
  return isNaN(num) ? defaultValue : num;
}

/**
 * Parse boolean value
 * @param {any} value 
 * @returns {boolean}
 */
function parseBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value > 0;
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    return lower === 'true' || lower === '1' || lower === 'yes';
  }
  return false;
}

/**
 * Transform raw CSV row to normalized format
 */
function transformRow(rawRow, headers) {
  const normalized = {};

  for (const header of headers) {
    const normalizedName = normalizeColumnName(header);
    normalized[normalizedName] = rawRow[header];
  }

  const close = parseNumber(normalized.close);
  
  return {
    date: parseDate(normalized.date),
    symbol: (normalized.symbol || normalized.ticker || '').toUpperCase().trim(),
    open: parseNumber(normalized.open) || close,
    high: parseNumber(normalized.high) || close,
    low: parseNumber(normalized.low) || close,
    close: close,
    volume: parseNumber(normalized.volume, 0),
    openInterest: parseNumber(normalized.openInterest || normalized.oi, 0),
    ...Object.fromEntries(
      Object.entries(normalized)
        .filter(([key]) => !['date', 'symbol', 'ticker', 'open', 'high', 'low', 'close', 'volume', 'openInterest', 'oi'].includes(key))
    ),
  };
}

/**
 * Transform entire CSV dataset
 */
function transformDataset(rawData, headers, options = {}) {
  const { skipInvalid = true, defaultSymbol = null } = options;

  const transformed = [];
  const errors = [];
  let skipped = 0;

  for (let i = 0; i < rawData.length; i++) {
    try {
      const row = transformRow(rawData[i], headers);

      if (!row.date) {
        if (skipInvalid) {
          skipped++;
          errors.push({ row: i + 1, error: 'Invalid or missing date' });
          continue;
        }
      }

      if (!row.symbol && defaultSymbol) {
        row.symbol = defaultSymbol;
      }

      if (!row.close || row.close <= 0) {
        if (skipInvalid) {
          skipped++;
          errors.push({ row: i + 1, error: 'Invalid or missing close price' });
          continue;
        }
      }

      transformed.push(row);
    } catch (err) {
      errors.push({ row: i + 1, error: err.message });
      if (skipInvalid) {
        skipped++;
      }
    }
  }

  return {
    data: transformed,
    errors: errors.slice(0, 100),
    stats: {
      total: rawData.length,
      transformed: transformed.length,
      skipped,
      errorCount: errors.length,
    },
  };
}

/**
 * Group transformed data by symbol
 */
function groupBySymbol(data) {
  const groups = new Map();

  for (const row of data) {
    const symbol = row.symbol || 'UNKNOWN';
    if (!groups.has(symbol)) {
      groups.set(symbol, []);
    }
    groups.get(symbol).push(row);
  }

  for (const [symbol, rows] of groups) {
    rows.sort((a, b) => a.date - b.date);
  }

  return groups;
}

/**
 * Deduplicate data by date (keep latest)
 */
function deduplicateByDate(data) {
  const seen = new Map();

  for (const row of data) {
    const dateKey = row.date.toISOString().split('T')[0];
    seen.set(dateKey, row);
  }

  return Array.from(seen.values()).sort((a, b) => a.date - b.date);
}

/**
 * Fill missing dates with interpolated values
 */
function fillMissingDates(data, options = {}) {
  const { fillMethod = 'forward', maxGapDays = 5 } = options;

  if (data.length < 2) return data;

  const filled = [data[0]];

  for (let i = 1; i < data.length; i++) {
    const prevDate = new Date(data[i - 1].date);
    const currDate = new Date(data[i].date);
    const diffDays = Math.round((currDate - prevDate) / (1000 * 60 * 60 * 24));

    if (diffDays > 1 && diffDays <= maxGapDays) {
      for (let d = 1; d < diffDays; d++) {
        const fillDate = new Date(prevDate);
        fillDate.setDate(fillDate.getDate() + d);

        if (fillDate.getDay() === 0 || fillDate.getDay() === 6) continue;

        let fillRow;
        if (fillMethod === 'forward') {
          fillRow = { ...data[i - 1], date: fillDate };
        } else if (fillMethod === 'backward') {
          fillRow = { ...data[i], date: fillDate };
        } else {
          const ratio = d / diffDays;
          fillRow = {
            date: fillDate,
            symbol: data[i].symbol,
            open: data[i - 1].open + (data[i].open - data[i - 1].open) * ratio,
            high: Math.max(data[i - 1].high, data[i].high),
            low: Math.min(data[i - 1].low, data[i].low),
            close: data[i - 1].close + (data[i].close - data[i - 1].close) * ratio,
            volume: 0,
            openInterest: data[i - 1].openInterest,
          };
        }

        filled.push(fillRow);
      }
    }

    filled.push(data[i]);
  }

  return filled;
}

/**
 * Convert data to database-ready format
 */
function toDatabaseFormat(data, tickerId) {
  return data.map(row => ({
    date: row.date,
    tickerId,
    open: row.open,
    high: row.high,
    low: row.low,
    close: row.close,
    volume: row.volume || 0,
    openInterest: row.openInterest || 0,
  }));
}

/**
 * Batch data for efficient database insertion
 */
function batchData(data, batchSize = 1000) {
  const batches = [];
  for (let i = 0; i < data.length; i += batchSize) {
    batches.push(data.slice(i, i + batchSize));
  }
  return batches;
}

/**
 * Format Date object to dd-mm-yyyy string
 */
function formatDateToDDMMYYYY(date) {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return '';
  }
  
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = date.getUTCFullYear();
  
  return `${day}-${month}-${year}`;
}

module.exports = {
  parseDate,
  parseNumber,
  parseBoolean,
  transformRow,
  transformDataset,
  groupBySymbol,
  deduplicateByDate,
  fillMissingDates,
  toDatabaseFormat,
  batchData,
  formatDateToDDMMYYYY,
};