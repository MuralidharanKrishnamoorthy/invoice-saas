const fs = require('fs');
const { PDFParse } = require('pdf-parse');
const XLSX = require('xlsx');
const Papa = require('papaparse');

/**
 * Universal File Parser Service
 * Extracts raw text/data from PDF, Excel, and CSV files
 */

// Parse PDF to text
const parsePDF = async (buffer) => {
    let parser;
    try {
        parser = new PDFParse({ data: buffer });
        const result = await parser.getText();
        // Clean up text: remove excessive newlines/spaces for token efficiency
        return result.text.replace(/\n\s*\n/g, '\n').trim().substring(0, 15000); // Limit context window
    } catch (error) {
        console.error('PDF Parse Error:', error);
        throw new Error('Failed to parse PDF file');
    } finally {
        // Always destroy the parser to free memory
        if (parser) {
            await parser.destroy();
        }
    }
};

// Parse Excel to CSV-like text
const parseExcel = async (buffer) => {
    try {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        // Convert to CSV string provided a dense representation for AI
        return XLSX.utils.sheet_to_csv(worksheet).substring(0, 15000);
    } catch (error) {
        console.error('Excel Parse Error:', error);
        throw new Error('Failed to parse Excel file');
    }
};

// Parse CSV (cleanup)
const parseCSV = async (buffer) => {
    try {
        const text = buffer.toString('utf8');
        return text.substring(0, 15000);
    } catch (error) {
        throw new Error('Failed to parse CSV file');
    }
};

// Main entry point
const parseFile = async (file) => {
    const extension = file.originalname.split('.').pop().toLowerCase();

    let rawData = '';
    let fileType = '';

    if (extension === 'pdf') {
        rawData = await parsePDF(file.buffer);
        fileType = 'PDF Invoice';
    } else if (['xlsx', 'xls'].includes(extension)) {
        rawData = await parseExcel(file.buffer);
        fileType = 'Excel Spreadsheet';
    } else if (extension === 'csv') {
        rawData = await parseCSV(file.buffer);
        fileType = 'CSV File';
    } else {
        throw new Error(`Unsupported file type: .${extension}`);
    }

    return { rawData, fileType };
};

module.exports = {
    parseFile
};
