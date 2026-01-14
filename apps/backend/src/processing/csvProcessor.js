/**
 * CSV Processor Module
 * Main entry point for processing uploaded CSV files
 * Handles parsing, validation, transformation, and database insertion
 */

const { Readable } = require('stream');
const prisma = require('../utils/prisma');
const { logger } = require('../utils/logger');
const { validateRequiredColumns, runDataQualityCheck } = require('./validators');
const { transformDataset, groupBySymbol, deduplicateByDate, toDatabaseFormat, batchData } = require('./transformers');
const { calculateAllDerivedFields } = require('./calculations');

/**
 * Parse CSV content to array of objects
 * @param {string} csvContent - Raw CSV string
 * @returns {Object} { headers, data }
 */
function parseCSV(csvContent) {
  const lines = csvContent.split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    throw new Error('CSV file is empty or has no data rows');
  }

  // Parse headers
  const headers = parseCSVLine(lines[0]);
  
  // Parse data rows
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === headers.length) {
      const row = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx];
      });
      data.push(row);
    }
  }

  return { headers, data };
}

/**
 * Parse a single CSV line handling quoted values
 * @param {string} line 
 * @returns {Array<string>}
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

/**
 * Main CSV Processor Class
 */
class CSVProcessor {
  constructor(options = {}) {
    this.options = {
      batchSize: options.batchSize || 1000,
      skipInvalid: options.skipInvalid !== false,
      calculateDerived: options.calculateDerived !== false,
      validateData: options.validateData !== false,
      ...options,
    };
    
    this.stats = {
      totalRows: 0,
      processedRows: 0,
      skippedRows: 0,
      insertedRows: 0,
      updatedRows: 0,
      errors: [],
      warnings: [],
    };
  }

  /**
   * Process uploaded file buffer
   * @param {Buffer} fileBuffer - File content as buffer
   * @param {string} fileName - Original file name
   * @param {Object} options - Processing options
   * @returns {Object} Processing result
   */
  async processUploadedFile(fileBuffer, fileName, options = {}) {
    const startTime = Date.now();
    const { defaultSymbol, tickerId } = options;

    try {
      logger.info('Starting CSV processing', { fileName });

      // Step 1: Parse CSV
      const csvContent = fileBuffer.toString('utf-8');
      const { headers, data } = parseCSV(csvContent);
      this.stats.totalRows = data.length;

      logger.info('CSV parsed', { rows: data.length, columns: headers.length });

      // Step 2: Validate columns
      const columnValidation = validateRequiredColumns(headers, 'daily');
      if (!columnValidation.valid) {
        throw new Error(columnValidation.errorMessage || 
          `Missing required columns: ${columnValidation.missingColumns.join(', ')}. ` +
          `Found columns: ${headers.join(', ')}. ` +
          `Required: Date, Close (or Ticker). Optional: Open, High, Low, Volume, OpenInterest`);
      }

      logger.info('Column validation passed', { 
        foundColumns: columnValidation.foundColumns,
        headers: headers 
      });

      // Step 3: PRE-VALIDATE ALL ROWS before any transformation
      // This ensures we reject the entire file if ANY row has invalid data
      const preValidationErrors = this.preValidateAllRows(data, headers, defaultSymbol);
      if (preValidationErrors.length > 0) {
        const errorSummary = preValidationErrors.slice(0, 10).join('; ');
        const totalErrors = preValidationErrors.length;
        throw new Error(
          `CSV validation failed with ${totalErrors} error(s). ` +
          `First errors: ${errorSummary}` +
          (totalErrors > 10 ? ` ... and ${totalErrors - 10} more errors` : '')
        );
      }

      logger.info('Pre-validation passed', { rows: data.length });

      // Step 4: Transform data (now safe since pre-validation passed)
      const transformed = transformDataset(data, headers, {
        skipInvalid: this.options.skipInvalid,
        defaultSymbol,
      });

      this.stats.processedRows = transformed.data.length;
      this.stats.skippedRows = transformed.stats.skipped;
      this.stats.errors.push(...transformed.errors);

      logger.info('Data transformed', { 
        processed: transformed.data.length, 
        skipped: transformed.stats.skipped 
      });

      // Step 5: Validate data quality (optional)
      if (this.options.validateData) {
        const qualityCheck = runDataQualityCheck(transformed.data);
        if (!qualityCheck.overallValid) {
          this.stats.warnings.push(...qualityCheck.validation.warningDetails);
        }
        logger.info('Data quality check complete', qualityCheck.summary);
      }

      // Step 6: Group by symbol and process each
      const symbolGroups = groupBySymbol(transformed.data);
      const results = [];

      for (const [symbol, symbolData] of symbolGroups) {
        const result = await this.processSymbolData(symbol, symbolData, tickerId, options);
        results.push(result);
      }

      const processingTime = Date.now() - startTime;

      logger.info('CSV processing complete', {
        fileName,
        processingTime: `${processingTime}ms`,
        symbols: symbolGroups.size,
        totalInserted: this.stats.insertedRows,
      });

      return {
        success: true,
        fileName,
        processingTime,
        stats: this.stats,
        results,
      };

    } catch (error) {
      logger.error('CSV processing failed', { fileName, error: error.message });
      
      return {
        success: false,
        fileName,
        error: error.message,
        stats: this.stats,
      };
    }
  }

  /**
   * Pre-validate all rows before any processing
   * Returns array of error messages, empty if all valid
   * @param {Array} data - Raw CSV data rows
   * @param {Array} headers - CSV headers
   * @param {string} defaultSymbol - Default symbol if not in data
   * @returns {Array<string>} Array of error messages
   */
  preValidateAllRows(data, headers, defaultSymbol = null) {
    const errors = [];
    const { parseDate, parseNumber } = require('./transformers');
    const { normalizeColumnName } = require('./validators');
    
    // Normalize headers for lookup
    const normalizedHeaders = headers.map(h => normalizeColumnName(h));
    const dateIndex = normalizedHeaders.indexOf('date');
    const closeIndex = normalizedHeaders.indexOf('close');
    const tickerIndex = normalizedHeaders.indexOf('symbol') !== -1 
      ? normalizedHeaders.indexOf('symbol') 
      : normalizedHeaders.indexOf('ticker');

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 2; // +2 because row 1 is header, and we're 0-indexed

      // Get values using original headers
      const dateValue = row[headers[dateIndex]];
      const closeValue = row[headers[closeIndex]];
      const tickerValue = tickerIndex >= 0 ? row[headers[tickerIndex]] : defaultSymbol;

      // Validate date - STRICT
      if (!dateValue || dateValue.trim() === '') {
        errors.push(`Row ${rowNum}: Missing date value`);
      } else {
        const parsedDate = parseDate(dateValue);
        if (!parsedDate) {
          errors.push(`Row ${rowNum}: Invalid date format "${dateValue}" (supports: DD-MM-YYYY, DD/MM/YYYY, YYYY-MM-DD, MM/DD/YYYY, DD.MM.YYYY, DD MMM YYYY, MMM DD YYYY, YYYYMMDD, and many other common formats)`);
        }
      }

      // Validate close price - REQUIRED
      if (!closeValue || closeValue.trim() === '') {
        errors.push(`Row ${rowNum}: Missing close price`);
      } else {
        const closeNum = parseNumber(closeValue);
        if (isNaN(closeNum) || closeNum <= 0) {
          errors.push(`Row ${rowNum}: Invalid close price "${closeValue}" (must be a positive number)`);
        }
      }

      // Validate ticker/symbol if no default
      if (!tickerValue && !defaultSymbol) {
        errors.push(`Row ${rowNum}: Missing ticker/symbol`);
      }

      // Stop after 50 errors to avoid huge error messages
      if (errors.length >= 50) {
        errors.push(`... validation stopped after 50 errors`);
        break;
      }
    }

    return errors;
  }

  /**
   * Process data for a single symbol with smart incremental updates
   * @param {string} symbol - Symbol name
   * @param {Array} data - Symbol data
   * @param {number} existingTickerId - Existing ticker ID (optional)
   * @param {Object} options - Processing options
   * @returns {Object} Processing result for symbol
   */
  async processSymbolData(symbol, data, existingTickerId = null, options = {}) {
    try {
      // Deduplicate by date
      const dedupedData = deduplicateByDate(data);

      // Get or create ticker
      let ticker;
      if (existingTickerId) {
        ticker = await prisma.ticker.findUnique({ where: { id: existingTickerId } });
      }
      
      if (!ticker) {
        ticker = await prisma.ticker.upsert({
          where: { symbol },
          update: {
            lastUpdated: new Date(),
          },
          create: {
            symbol,
            name: symbol,
            isActive: true,
          },
        });
      }

      // SMART INCREMENTAL UPDATE LOGIC
      let dataToProcess = dedupedData;
      let isIncrementalUpdate = false;
      let lastDbDate = null;

      // Check if this ticker already has data
      const existingDataInfo = await prisma.seasonalityData.findFirst({
        where: { tickerId: ticker.id },
        orderBy: { date: 'desc' },
        select: { date: true }
      });

      if (existingDataInfo && options.incrementalUpdate !== false) {
        lastDbDate = existingDataInfo.date;
        logger.info('Found existing data for ticker', { 
          symbol, 
          lastDbDate: lastDbDate.toISOString().split('T')[0],
          totalCsvRecords: dedupedData.length 
        });

        // Filter CSV data to only include records after the last DB date
        const newRecords = dedupedData.filter(record => record.date > lastDbDate);
        
        if (newRecords.length > 0) {
          dataToProcess = newRecords;
          isIncrementalUpdate = true;
          logger.info('Incremental update detected', {
            symbol,
            lastDbDate: lastDbDate.toISOString().split('T')[0],
            newRecords: newRecords.length,
            dateRange: newRecords.length > 0 ? {
              from: newRecords[0].date.toISOString().split('T')[0],
              to: newRecords[newRecords.length - 1].date.toISOString().split('T')[0]
            } : null
          });
        } else {
          logger.info('No new records found for incremental update', {
            symbol,
            lastDbDate: lastDbDate.toISOString().split('T')[0],
            latestCsvDate: dedupedData.length > 0 ? dedupedData[dedupedData.length - 1].date.toISOString().split('T')[0] : 'none'
          });
          
          // ALWAYS check calculated tables and force recalculation if empty
          logger.info('Checking if calculated tables have data...', { symbol, tickerId: ticker.id });
          
          const mondayWeeklyCount = await prisma.mondayWeeklyData.count({ where: { tickerId: ticker.id } });
          const expiryWeeklyCount = await prisma.expiryWeeklyData.count({ where: { tickerId: ticker.id } });
          const monthlyCount = await prisma.monthlySeasonalityData.count({ where: { tickerId: ticker.id } });
          const yearlyCount = await prisma.yearlySeasonalityData.count({ where: { tickerId: ticker.id } });
          
          logger.info('Calculated table counts', { 
            symbol, 
            mondayWeeklyCount, 
            expiryWeeklyCount, 
            monthlyCount, 
            yearlyCount,
            total: mondayWeeklyCount + expiryWeeklyCount + monthlyCount + yearlyCount
          });
          
          const calculatedTablesEmpty = (mondayWeeklyCount + expiryWeeklyCount + monthlyCount + yearlyCount) === 0;
          
          if (calculatedTablesEmpty) {
            logger.info('*** CALCULATED TABLES ARE EMPTY - FORCING FULL RECALCULATION ***', { 
              symbol, 
              tickerId: ticker.id
            });
            // Don't return early - continue to recalculation
            isIncrementalUpdate = false;
            dataToProcess = []; // No new OHLCV to insert, but we'll recalculate
          } else {
            // Tables have data and no new records - skip
            if (options.forceFullRecalculation !== true) {
              logger.info('Calculated tables have data, no new records - skipping', { symbol });
              return {
                symbol,
                tickerId: ticker.id,
                recordCount: 0,
                inserted: 0,
                updated: 0,
                skipped: dedupedData.length,
                message: 'No new data to process'
              };
            }
          }
        }
      } else {
        logger.info('Full data processing - no existing data found', { symbol });
      }

      // Convert to database format and store basic OHLCV data
      const dbRecords = toDatabaseFormat(dataToProcess, ticker.id);
      const batches = batchData(dbRecords, this.options.batchSize);
      let inserted = 0;
      let updated = 0;

      for (const batch of batches) {
        const result = await this.upsertBatch(batch);
        inserted += result.inserted;
        updated += result.updated;
      }

      this.stats.insertedRows += inserted;
      this.stats.updatedRows += updated;

      // Generate calculated data and store in Phase 2 tables
      let calculatedCounts = null;
      logger.info('Checking generateCalculatedData option', { 
        symbol, 
        generateCalculatedData: options.generateCalculatedData,
        isIncrementalUpdate,
        dataToProcessLength: dataToProcess.length
      });
      
      if (options.generateCalculatedData !== false) {
        logger.info('Starting calculated data generation', { 
          symbol, 
          recordCount: dataToProcess.length,
          isIncrementalUpdate 
        });
        
        try {
          if (isIncrementalUpdate && options.smartRecalculation !== false) {
            // For incremental updates, we need to recalculate from a safe point
            // Get all data from 1 year before the last DB date to ensure proper calculations
            const recalcFromDate = new Date(lastDbDate);
            recalcFromDate.setFullYear(recalcFromDate.getFullYear() - 1);
            
            const allRecentData = await prisma.seasonalityData.findMany({
              where: {
                tickerId: ticker.id,
                date: { gte: recalcFromDate }
              },
              orderBy: { date: 'asc' },
              select: {
                date: true,
                open: true,
                high: true,
                low: true,
                close: true,
                volume: true,
                openInterest: true
              }
            });

            // Convert DB format back to processing format
            const dataForCalculation = allRecentData.map(record => ({
              date: record.date,
              symbol: symbol,
              open: record.open,
              high: record.high,
              low: record.low,
              close: record.close,
              volume: record.volume,
              openInterest: record.openInterest
            }));

            logger.info('Smart incremental recalculation', {
              symbol,
              recalcFromDate: recalcFromDate.toISOString().split('T')[0],
              recordsForCalculation: dataForCalculation.length
            });

            calculatedCounts = await this.generateAndStoreCalculatedData(ticker.id, symbol, dataForCalculation, {
              isIncremental: true,
              fromDate: recalcFromDate,
              onProgress: options.onProgress // Pass progress callback
            });
          } else {
            // Full recalculation - get all data for this ticker
            const allData = await prisma.seasonalityData.findMany({
              where: { tickerId: ticker.id },
              orderBy: { date: 'asc' },
              select: {
                date: true,
                open: true,
                high: true,
                low: true,
                close: true,
                volume: true,
                openInterest: true
              }
            });

            const dataForCalculation = allData.map(record => ({
              date: record.date,
              symbol: symbol,
              open: record.open,
              high: record.high,
              low: record.low,
              close: record.close,
              volume: record.volume,
              openInterest: record.openInterest
            }));

            logger.info('Full recalculation', {
              symbol,
              totalRecords: dataForCalculation.length
            });

            calculatedCounts = await this.generateAndStoreCalculatedData(ticker.id, symbol, dataForCalculation, {
              isIncremental: false,
              onProgress: options.onProgress // Pass progress callback
            });
          }
          
          logger.info('Generated calculated data', {
            symbol,
            isIncrementalUpdate,
            daily: calculatedCounts.daily,
            mondayWeekly: calculatedCounts.mondayWeekly,
            expiryWeekly: calculatedCounts.expiryWeekly,
            monthly: calculatedCounts.monthly,
            yearly: calculatedCounts.yearly
          });
        } catch (calcError) {
          logger.error('Calculated data generation failed', { symbol, error: calcError.message, stack: calcError.stack });
          // Continue processing even if calculation fails
        }
      } else {
        logger.info('Skipping calculated data generation - disabled', { symbol });
      }

      // Update ticker statistics
      await this.updateTickerStats(ticker.id);

      return {
        symbol,
        tickerId: ticker.id,
        recordCount: dataToProcess.length,
        inserted,
        updated,
        calculatedData: calculatedCounts,
        isIncrementalUpdate,
        lastDbDate: lastDbDate ? lastDbDate.toISOString().split('T')[0] : null,
        newDataRange: dataToProcess.length > 0 ? {
          from: dataToProcess[0].date.toISOString().split('T')[0],
          to: dataToProcess[dataToProcess.length - 1].date.toISOString().split('T')[0]
        } : null
      };

    } catch (error) {
      logger.error('Symbol processing failed', { symbol, error: error.message });
      this.stats.errors.push({ symbol, error: error.message });
      
      return {
        symbol,
        error: error.message,
      };
    }
  }

  /**
   * Upsert a batch of records
   * @param {Array} batch - Batch of records
   * @returns {Object} { inserted, updated }
   */
  async upsertBatch(batch) {
    let inserted = 0;
    let updated = 0;

    // Use transaction for batch operations with extended timeout
    await prisma.$transaction(async (tx) => {
      for (const record of batch) {
        const existing = await tx.seasonalityData.findUnique({
          where: {
            date_tickerId: {
              date: record.date,
              tickerId: record.tickerId,
            },
          },
        });

        if (existing) {
          await tx.seasonalityData.update({
            where: { id: existing.id },
            data: {
              open: record.open,
              high: record.high,
              low: record.low,
              close: record.close,
              volume: record.volume,
              openInterest: record.openInterest,
              updatedAt: new Date(),
            },
          });
          updated++;
        } else {
          await tx.seasonalityData.create({
            data: record,
          });
          inserted++;
        }
      }
    }, {
      maxWait: 300000,  // 5 minutes max wait
      timeout: 120000,  // 2 minutes timeout
    });

    return { inserted, updated };
  }

  /**
   * Generate calculated data and store in Phase 2 tables
   * OPTIMIZED VERSION - Uses batch operations for 10-20x faster processing
   * @param {number} tickerId - Ticker ID
   * @param {string} symbol - Symbol name
   * @param {Array} dailyData - Daily data
   * @param {Object} options - Generation options
   * @returns {Object} Counts of stored records
   */
  async generateAndStoreCalculatedData(tickerId, symbol, dailyData, options = {}) {
    logger.info('=== STARTING generateAndStoreCalculatedData (OPTIMIZED) ===', {
      symbol,
      tickerId,
      dailyDataLength: dailyData?.length || 0,
      options
    });

    const { onProgress } = options; // Progress callback

    try {
      const { generateSymbolFiles } = require('./fileGenerator');
      const { isIncremental = false, fromDate = null } = options;
      
      // Report progress: 5%
      if (onProgress) onProgress(5, 'Generating calculated data...');
      
      logger.info('STEP 1: Calling generateSymbolFiles', { symbol, inputRecords: dailyData.length });
      
      // Generate calculated data using the same logic as Python
      const calculatedData = await generateSymbolFiles(dailyData, symbol);
      
      // Report progress: 15%
      if (onProgress) onProgress(15, 'Calculated data generated');
      
      logger.info('STEP 2: generateSymbolFiles completed', {
        symbol,
        daily: calculatedData.daily?.length || 0,
        mondayWeekly: calculatedData.mondayWeekly?.length || 0,
        expiryWeekly: calculatedData.expiryWeekly?.length || 0,
        monthly: calculatedData.monthly?.length || 0,
        yearly: calculatedData.yearly?.length || 0
      });

      // Store in Phase 2 tables
      const counts = {
        daily: 0,
        mondayWeekly: 0,
        expiryWeekly: 0,
        monthly: 0,
        yearly: 0
      };

      // Helper functions for proper value handling
      const toBool = (val) => val === true || val === false ? val : null;
      const toNum = (val) => val !== null && val !== undefined && !isNaN(val) ? val : null;

      // For incremental updates, delete old data first
      if (isIncremental && fromDate) {
        if (onProgress) onProgress(18, 'Cleaning up old data...');
        
        await Promise.all([
          prisma.dailySeasonalityData.deleteMany({ where: { tickerId, date: { gte: fromDate } } }),
          prisma.mondayWeeklyData.deleteMany({ where: { tickerId, date: { gte: fromDate } } }),
          prisma.expiryWeeklyData.deleteMany({ where: { tickerId, date: { gte: fromDate } } }),
          prisma.monthlySeasonalityData.deleteMany({ where: { tickerId, date: { gte: fromDate } } }),
          prisma.yearlySeasonalityData.deleteMany({ where: { tickerId, date: { gte: fromDate } } })
        ]);
      }

      // ============================================
      // BATCH UPSERT HELPER - Much faster than individual upserts!
      // ============================================
      const batchUpsert = async (model, records, mapFn, batchSize = 100) => {
        let count = 0;
        for (let i = 0; i < records.length; i += batchSize) {
          const batch = records.slice(i, i + batchSize);
          const operations = batch.map(record => {
            const data = mapFn(record);
            return prisma[model].upsert({
              where: { date_tickerId: { date: data.date, tickerId } },
              update: { ...data, updatedAt: new Date() },
              create: { ...data, tickerId, createdAt: new Date(), updatedAt: new Date() }
            });
          });
          await prisma.$transaction(operations);
          count += batch.length;
        }
        return count;
      };

      // ============================================
      // STEP 4: Store Monday Weekly (20-30% progress)
      // ============================================
      if (calculatedData.mondayWeekly?.length > 0) {
        if (onProgress) onProgress(20, `Storing Monday weekly data (${calculatedData.mondayWeekly.length} records)...`);
        
        counts.mondayWeekly = await batchUpsert('mondayWeeklyData', calculatedData.mondayWeekly, (r) => ({
          date: r.date,
          open: r.open || 0, high: r.high || 0, low: r.low || 0, close: r.close || 0,
          volume: r.volume || 0, openInterest: r.openInterest || 0,
          weekday: r.weekday || null,
          weekNumberMonthly: toNum(r.weekNumberMonthly), weekNumberYearly: toNum(r.weekNumberYearly),
          evenWeekNumberMonthly: toBool(r.evenWeekNumberMonthly), evenWeekNumberYearly: toBool(r.evenWeekNumberYearly),
          returnPoints: toNum(r.returnPoints), returnPercentage: toNum(r.returnPercentage),
          positiveWeek: toBool(r.positiveWeek), evenMonth: toBool(r.evenMonth),
          monthlyReturnPoints: toNum(r.monthlyReturnPoints), monthlyReturnPercentage: toNum(r.monthlyReturnPercentage),
          positiveMonth: toBool(r.positiveMonth), evenYear: toBool(r.evenYear),
          yearlyReturnPoints: toNum(r.yearlyReturnPoints), yearlyReturnPercentage: toNum(r.yearlyReturnPercentage),
          positiveYear: toBool(r.positiveYear)
        }));
        
        logger.info('Monday weekly stored', { symbol, count: counts.mondayWeekly });
      }

      // ============================================
      // STEP 5: Store Expiry Weekly (30-40% progress)
      // ============================================
      if (calculatedData.expiryWeekly?.length > 0) {
        if (onProgress) onProgress(30, `Storing Expiry weekly data (${calculatedData.expiryWeekly.length} records)...`);
        
        counts.expiryWeekly = await batchUpsert('expiryWeeklyData', calculatedData.expiryWeekly, (r) => ({
          date: r.date,
          startDate: r.startDate || null, // Added: Start date of expiry week (Date - 6 days)
          open: r.open || 0, high: r.high || 0, low: r.low || 0, close: r.close || 0,
          volume: r.volume || 0, openInterest: r.openInterest || 0,
          weekday: r.weekday || null,
          weekNumberMonthly: toNum(r.weekNumberMonthly), weekNumberYearly: toNum(r.weekNumberYearly),
          evenWeekNumberMonthly: toBool(r.evenWeekNumberMonthly), evenWeekNumberYearly: toBool(r.evenWeekNumberYearly),
          returnPoints: toNum(r.returnPoints), returnPercentage: toNum(r.returnPercentage),
          positiveWeek: toBool(r.positiveWeek), evenMonth: toBool(r.evenMonth),
          monthlyReturnPoints: toNum(r.monthlyReturnPoints), monthlyReturnPercentage: toNum(r.monthlyReturnPercentage),
          positiveMonth: toBool(r.positiveMonth), evenYear: toBool(r.evenYear),
          yearlyReturnPoints: toNum(r.yearlyReturnPoints), yearlyReturnPercentage: toNum(r.yearlyReturnPercentage),
          positiveYear: toBool(r.positiveYear)
        }));
        
        logger.info('Expiry weekly stored', { symbol, count: counts.expiryWeekly });
      }

      // ============================================
      // STEP 6: Store Monthly (40-50% progress)
      // ============================================
      if (calculatedData.monthly?.length > 0) {
        if (onProgress) onProgress(40, `Storing Monthly data (${calculatedData.monthly.length} records)...`);
        
        counts.monthly = await batchUpsert('monthlySeasonalityData', calculatedData.monthly, (r) => ({
          date: r.date,
          open: r.open || 0, high: r.high || 0, low: r.low || 0, close: r.close || 0,
          volume: r.volume || 0, openInterest: r.openInterest || 0,
          weekday: r.weekday || null, evenMonth: toBool(r.evenMonth),
          returnPoints: toNum(r.returnPoints), returnPercentage: toNum(r.returnPercentage),
          positiveMonth: toBool(r.positiveMonth), evenYear: toBool(r.evenYear),
          yearlyReturnPoints: toNum(r.yearlyReturnPoints), yearlyReturnPercentage: toNum(r.yearlyReturnPercentage),
          positiveYear: toBool(r.positiveYear)
        }));
        
        logger.info('Monthly stored', { symbol, count: counts.monthly });
      }

      // ============================================
      // STEP 7: Store Yearly (50-55% progress)
      // ============================================
      if (calculatedData.yearly?.length > 0) {
        if (onProgress) onProgress(50, `Storing Yearly data (${calculatedData.yearly.length} records)...`);
        
        counts.yearly = await batchUpsert('yearlySeasonalityData', calculatedData.yearly, (r) => ({
          date: r.date,
          open: r.open || 0, high: r.high || 0, low: r.low || 0, close: r.close || 0,
          volume: r.volume || 0, openInterest: r.openInterest || 0,
          weekday: r.weekday || null, evenYear: toBool(r.evenYear),
          returnPoints: toNum(r.returnPoints), returnPercentage: toNum(r.returnPercentage),
          positiveYear: toBool(r.positiveYear)
        }));
        
        logger.info('Yearly stored', { symbol, count: counts.yearly });
      }

      // ============================================
      // STEP 8: Store Daily (55-95% progress) - Largest dataset
      // ============================================
      if (calculatedData.daily?.length > 0) {
        const totalDaily = calculatedData.daily.length;
        logger.info('Starting Daily data storage', { symbol, count: totalDaily });
        
        // Use larger batch size for daily data to reduce DB round trips
        const dailyBatchSize = 500;
        let dailyCount = 0;
        let lastProgressReport = 0;
        
        for (let i = 0; i < totalDaily; i += dailyBatchSize) {
          const batch = calculatedData.daily.slice(i, i + dailyBatchSize);
          
          const operations = batch.map(r => {
            const data = {
              date: r.date,
              open: r.open || 0, high: r.high || 0, low: r.low || 0, close: r.close || 0,
              volume: r.volume || 0, openInterest: r.openInterest || 0,
              weekday: r.weekday || null,
              calendarMonthDay: toNum(r.calendarMonthDay), calendarYearDay: toNum(r.calendarYearDay),
              tradingMonthDay: toNum(r.tradingMonthDay), tradingYearDay: toNum(r.tradingYearDay),
              evenCalendarMonthDay: toBool(r.evenCalendarMonthDay), evenCalendarYearDay: toBool(r.evenCalendarYearDay),
              evenTradingMonthDay: toBool(r.evenTradingMonthDay), evenTradingYearDay: toBool(r.evenTradingYearDay),
              returnPoints: toNum(r.returnPoints), returnPercentage: toNum(r.returnPercentage),
              positiveDay: toBool(r.positiveDay),
              mondayWeeklyDate: r.mondayWeeklyDate || null,
              mondayWeekNumberMonthly: toNum(r.mondayWeekNumberMonthly), mondayWeekNumberYearly: toNum(r.mondayWeekNumberYearly),
              evenMondayWeekNumberMonthly: toBool(r.evenMondayWeekNumberMonthly), evenMondayWeekNumberYearly: toBool(r.evenMondayWeekNumberYearly),
              mondayWeeklyReturnPoints: toNum(r.mondayWeeklyReturnPoints), mondayWeeklyReturnPercentage: toNum(r.mondayWeeklyReturnPercentage),
              positiveMondayWeek: toBool(r.positiveMondayWeek),
              expiryWeeklyDate: r.expiryWeeklyDate || null,
              expiryWeekNumberMonthly: toNum(r.expiryWeekNumberMonthly), expiryWeekNumberYearly: toNum(r.expiryWeekNumberYearly),
              evenExpiryWeekNumberMonthly: toBool(r.evenExpiryWeekNumberMonthly), evenExpiryWeekNumberYearly: toBool(r.evenExpiryWeekNumberYearly),
              expiryWeeklyReturnPoints: toNum(r.expiryWeeklyReturnPoints), expiryWeeklyReturnPercentage: toNum(r.expiryWeeklyReturnPercentage),
              positiveExpiryWeek: toBool(r.positiveExpiryWeek),
              evenMonth: toBool(r.evenMonth),
              monthlyReturnPoints: toNum(r.monthlyReturnPoints), monthlyReturnPercentage: toNum(r.monthlyReturnPercentage),
              positiveMonth: toBool(r.positiveMonth),
              evenYear: toBool(r.evenYear),
              yearlyReturnPoints: toNum(r.yearlyReturnPoints), yearlyReturnPercentage: toNum(r.yearlyReturnPercentage),
              positiveYear: toBool(r.positiveYear)
            };
            
            return prisma.dailySeasonalityData.upsert({
              where: { date_tickerId: { date: data.date, tickerId } },
              update: { ...data, updatedAt: new Date() },
              create: { ...data, tickerId, createdAt: new Date(), updatedAt: new Date() }
            });
          });
          
          await prisma.$transaction(operations);
          dailyCount += batch.length;
          
          // Report progress only every 10% to reduce DB update frequency
          const dailyProgress = 55 + Math.round((dailyCount / totalDaily) * 40);
          if (onProgress && dailyProgress >= lastProgressReport + 10) {
            lastProgressReport = dailyProgress;
            onProgress(dailyProgress, `Storing Daily data... ${dailyCount}/${totalDaily}`);
          }
        }
        
        counts.daily = dailyCount;
        logger.info('Daily stored', { symbol, count: counts.daily });
      }

      // Report progress: 100%
      if (onProgress) onProgress(100, 'Complete');

      logger.info('=== COMPLETED generateAndStoreCalculatedData ===', { symbol, counts });
      return counts;

    } catch (error) {
      logger.error('=== FAILED generateAndStoreCalculatedData ===', { symbol, error: error.message, stack: error.stack });
      throw error;
    }
  }

  async updateTickerStats(tickerId) {
    const stats = await prisma.seasonalityData.aggregate({
      where: { tickerId },
      _count: { id: true },
      _min: { date: true },
      _max: { date: true },
    });

    await prisma.ticker.update({
      where: { id: tickerId },
      data: {
        totalRecords: stats._count.id,
        firstDataDate: stats._min.date,
        lastDataDate: stats._max.date,
        lastUpdated: new Date(),
      },
    });
  }

  /**
   * Process multiple files in batch
   * @param {Array<{buffer: Buffer, name: string}>} files 
   * @param {Function} progressCallback - Progress callback
   * @returns {Object} Batch processing result
   */
  async processBatch(files, progressCallback = null) {
    const results = [];
    let completed = 0;

    for (const file of files) {
      const result = await this.processUploadedFile(file.buffer, file.name);
      results.push(result);
      
      completed++;
      if (progressCallback) {
        progressCallback({
          completed,
          total: files.length,
          percentage: (completed / files.length) * 100,
          currentFile: file.name,
        });
      }
    }

    return {
      totalFiles: files.length,
      successCount: results.filter(r => r.success).length,
      failureCount: results.filter(r => !r.success).length,
      results,
    };
  }
}

/**
 * Create a new CSV processor instance
 * @param {Object} options 
 * @returns {CSVProcessor}
 */
function createProcessor(options = {}) {
  return new CSVProcessor(options);
}

module.exports = {
  CSVProcessor,
  createProcessor,
  parseCSV,
  parseCSVLine,
};
