const OpenAI = require('openai');
const logger = require('../config/logger');

if (!process.env.OPENAI_API_KEY) {
    logger.warn('OPENAI_API_KEY is not set');
}

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const extractInvoiceData = async (rawData, fileType, isPro = false) => {
    try {
        const model = "gpt-4o-mini";

        const systemPrompt = `You are an expert Data Extraction AI specialized in invoice data extraction.

        CONTEXT:
        - System tracks money OWED by CLIENTS
        - Extract BUYER/CUSTOMER info (who owes money)
        - NOT seller/vendor info

        INVOICE DIRECTION:
        1. FROM you TO a client -> Extract client info
        2. FROM a vendor TO you -> Extract YOUR info as client

        EXTRACT 6 FIELDS:
        1. invoice_number
        2. client_name
        3. client_email
        4. amount (number, no symbols)
        5. due_date (YYYY-MM-DD)
        6. currency (3-letter code)

        Output valid JSON array of objects.`;

        const MAX_CHARS = 12000;
        let truncatedData = rawData;
        if (rawData.length > MAX_CHARS) {
            truncatedData = rawData.substring(0, 10000) + '\n...[TRUNCATED]...\n' + rawData.substring(rawData.length - 2000);
        }

        const userPrompt = `Extract invoice data from the following ${fileType} text:\n\n${truncatedData}`;

        const completion = await openai.chat.completions.create({
            model: model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            response_format: { type: "json_object" },
            temperature: 0.1
        });

        const rawResponse = completion.choices[0].message.content;
        const result = JSON.parse(rawResponse);

        let invoices;
        if (Array.isArray(result)) {
            invoices = result;
        } else if (result.invoices || result.data) {
            invoices = result.invoices || result.data;
        } else if (result.invoice_number) {
            invoices = [result];
        } else {
            invoices = [];
        }

        return invoices;
    } catch (error) {
        logger.error('AI Agent Error:', error.message);
        throw new Error(`AI failed to extract data: ${error.message}`);
    }
};

module.exports = {
    extractInvoiceData
};
