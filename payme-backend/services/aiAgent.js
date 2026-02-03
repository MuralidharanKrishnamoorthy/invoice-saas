const OpenAI = require('openai');

if (!process.env.OPENAI_API_KEY) {
    console.warn('WARNING: OPENAI_API_KEY is not set in environment variables!');
}

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

/**
 * AI Agent Service
 * Orchestrates OpenAIs GPT-4o to standardize raw financial data
 */
const extractInvoiceData = async (rawData, fileType, isPro = false) => {
    try {
        const model = "gpt-4o-mini"; // User requested minimum model for all tasks
        console.log(`🧠 AI Agent using model: ${model}`);

        const systemPrompt = `You are an expert Data Extraction AI specialized in invoice data extraction.
        
        IMPORTANT CONTEXT:
        - This system tracks money YOU (the user) are OWED by your CLIENTS/CUSTOMERS
        - You need to extract information about the BUYER/CUSTOMER (who owes money)
        - NOT the seller/vendor information
        
        INVOICE DIRECTION DETECTION:
        1. If the invoice is FROM you TO a client → Extract the client's info (Bill To, Customer)
        2. If the invoice is FROM a vendor TO you → Extract YOUR info (Bill To section) as the "client"
        
        Example 1 (You are the seller):
        - From: Your Company → To: John Doe (john@example.com)
        - Extract: client_name="John Doe", client_email="john@example.com"
        
        Example 2 (You are the buyer - like your Claude invoice):
        - From: Anthropic → To: claudeai2005@gmail.com
        - Extract: client_name="claudeai2005@gmail.com's Organization", client_email="claudeai2005@gmail.com"
        
        EXTRACT THESE 6 FIELDS:
        
        1. **Invoice Number/ID**: 
           - ANY unique identifier (numbers, alphanumeric, with symbols)
           - Labels: "Invoice #", "Bill No", "Reference", "ID", "Number", etc.
           - Examples: "INV-001", "AKQX0CCL-0025", "12345", "2024/001"
        
        2. **Client/Customer Name** (THE PERSON/COMPANY WHO OWES MONEY):
           - Look in "Bill To", "Customer", "Client", "To", "Recipient" section
           - Can be person name OR company name
           - Examples: "John Doe", "ABC Corp", "claudeai2005@gmail.com's Organization"
        
        3. **Client Email** (THE PERSON WHO OWES MONEY):
           - PATTERN MATCH: xxx@xxx.xxx format
           - Look in the "Bill To" or customer section
           - Extract ANY email you find in the customer/buyer section
           - Examples: "john@example.com", "claudeai2005@gmail.com"
        
        4. **Amount/Total**: 
           - The FINAL/TOTAL amount to be paid
           - Remove ALL symbols: $, €, ₹, £, Rs, USD, commas
           - Labels: "Total", "Amount Due", "Grand Total", "Balance"
           - Examples: "$23.60" → 23.60, "₹1,000" → 1000, "€50.00" → 50.00
        
        5. **Due Date/Payment Date**: 
           - When payment is expected
           - Labels: "Due Date", "Date Due", "Payment Due", "Pay By"
           - Convert to YYYY-MM-DD format
           - Examples: "January 11, 2026" → "2026-01-11"
        
        6. **Currency**: 
           - Detect the currency from symbols or text
           - Symbol mapping: $ → USD, ₹ or Rs → INR, € → EUR, £ → GBP, ¥ → JPY
           - Also look for text: "USD", "INR", "EUR", "GBP", "JPY", etc.
           - Return 3-letter currency code (ISO 4217)
           - Examples: "$23.60" → "USD", "₹1,000" → "INR", "€50" → "EUR"
           - Default to "USD" if no currency detected
        
        CRITICAL INSTRUCTIONS:
        - Use SEMANTIC UNDERSTANDING and CONTEXT
        - Use PATTERN RECOGNITION (email regex, currency, dates)
        - Handle CUSTOM formats flexibly
        - Search ENTIRE document
        - Be EXTREMELY FLEXIBLE
        
        OUTPUT FORMAT (JSON Array):
        [
            {
                "invoice_number": "string",
                "client_name": "string",
                "client_email": "string (email pattern)",
                "amount": number (no symbols),
                "due_date": "YYYY-MM-DD",
                "currency": "string (3-letter code: USD, INR, EUR, GBP, etc.)"
            }
        ]
        
        RULES:
        1. Extract ALL valid invoice records found
        2. Normalize dates to YYYY-MM-DD
        3. Convert currency to pure numbers
        4. Detect and extract currency code
        5. If field not found, set to null (except currency defaults to "USD")
        6. Return ONLY valid JSON, no markdown
        7. If NO data found, return empty array: []
        8. For emails: Extract from customer/buyer section
        9. For amounts: Use the final total
        10. For dates: Prefer "due date" over "invoice date"
        11. For currency: Map symbols to codes ($ → USD, ₹ → INR, € → EUR, £ → GBP)`;

        // OPTIMIZATION: Truncate large files to save tokens
        // Keep first 10k chars and last 2k chars (where totals usually are)
        const MAX_CHARS = 12000;
        let truncatedData = rawData;
        if (rawData.length > MAX_CHARS) {
            console.log(`⚠️ Truncating input from ${rawData.length} to ${MAX_CHARS} chars`);
            truncatedData = rawData.substring(0, 10000) + '\n...[TRUNCATED]...\n' + rawData.substring(rawData.length - 2000);
        }

        const userPrompt = `Extract invoice data from the following ${fileType} raw text:\n\n${truncatedData}`;

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
        console.log('🔍 Raw AI Response:', rawResponse);

        const result = JSON.parse(rawResponse);
        console.log('🔍 Parsed Result:', JSON.stringify(result, null, 2));

        // Handle different response formats
        let invoices;
        if (Array.isArray(result)) {
            // AI returned an array directly
            invoices = result;
        } else if (result.invoices || result.data) {
            // AI wrapped it in a key
            invoices = result.invoices || result.data;
        } else if (result.invoice_number) {
            // AI returned a single invoice object - wrap it in an array
            invoices = [result];
        } else {
            // No valid data found
            invoices = [];
        }
        console.log('🔍 Final Invoices Array:', JSON.stringify(invoices, null, 2));

        return invoices;
    } catch (error) {
        console.error('❌ AI Agent Error:', error.message);
        if (error.response) {
            console.error('OpenAI API Response:', error.response.status, error.response.data);
        }
        throw new Error(`AI failed to extract data: ${error.message}`);
    }
};

module.exports = {
    extractInvoiceData
};
