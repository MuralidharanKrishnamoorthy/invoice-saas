const fs = require('fs');
const { PDFParse } = require('pdf-parse');
const XLSX = require('xlsx');
const logger = require('../config/logger');

const parsePDF = async (buffer) => {
    let parser;
    try {
        parser = new PDFParse({ data: buffer });
        const result = await parser.getText();
        return result.text.replace(/\n\s*\n/g, '\n').trim().substring(0, 15000);
    } catch (error) {
        logger.error('PDF Parse Error:', error);
        throw new Error('Failed to parse PDF');
    } finally {
        if (parser) await parser.destroy();
    }
};

const parseExcel = async (buffer) => {
    try {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        return XLSX.utils.sheet_to_csv(worksheet).substring(0, 15000);
    } catch (error) {
        logger.error('Excel Parse Error:', error);
        throw new Error('Failed to parse Excel');
    }
};

const parseCSV = async (buffer) => {
    try {
        return buffer.toString('utf8').substring(0, 15000);
    } catch (error) {
        throw new Error('Failed to parse CSV');
    }
};

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
        throw new Error(`Unsupported type: .${extension}`);
    }

    return { rawData, fileType };
};

module.exports = { parseFile };
