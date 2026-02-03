const Papa = require('papaparse');

function cleanCSVData(data) {
    return data.map((row) => {
        const invoice =
            row.Invoice ||
            row.invoice ||
            row['Invoice Number'] ||
            row['Invoice #'] ||
            row.InvoiceNumber ||
            row.invoice_number ||
            '';

        const client =
            row.Client ||
            row.client ||
            row['Client Name'] ||
            row.ClientName ||
            row.customer ||
            row.Customer ||
            '';

        const email =
            row.Email ||
            row.email ||
            row['Client Email'] ||
            row.ClientEmail ||
            row['Email Address'] ||
            '';

        const amountRaw =
            row.Amount ||
            row.amount ||
            row.Total ||
            row.total ||
            row.Price ||
            row.price ||
            '';
        const amount = parseFloat(
            String(amountRaw).replace(/[₹$,\s]/g, '')
        );

        const due =
            row.Due ||
            row.due ||
            row['Due Date'] ||
            row.DueDate ||
            row.due_date ||
            '';

        return {
            invoice: String(invoice).trim(),
            client: String(client).trim(),
            email: String(email).trim().toLowerCase(),
            amount: isNaN(amount) ? 0 : amount,
            due: String(due).trim(),
        };
    });
}

function validateInvoiceData(invoices) {
    const errors = [];
    const validInvoices = [];

    invoices.forEach((inv, index) => {
        const rowErrors = [];

        if (!inv.invoice) rowErrors.push(`Row ${index + 1}: Missing invoice number`);
        if (!inv.client) rowErrors.push(`Row ${index + 1}: Missing client name`);
        if (!inv.email || !isValidEmail(inv.email))
            rowErrors.push(`Row ${index + 1}: Invalid email`);
        if (!inv.amount || inv.amount <= 0)
            rowErrors.push(`Row ${index + 1}: Invalid amount`);
        if (!inv.due || !isValidDate(inv.due))
            rowErrors.push(`Row ${index + 1}: Invalid due date`);

        if (rowErrors.length > 0) {
            errors.push(...rowErrors);
        } else {
            validInvoices.push(inv);
        }
    });

    return { validInvoices, errors };
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidDate(dateString) {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
}

function calculateDaysLate(dueDate) {
    const due = new Date(dueDate);
    const today = new Date();
    const diff = Math.floor((today - due) / (1000 * 60 * 60 * 24));
    return diff;
}

module.exports = {
    cleanCSVData,
    validateInvoiceData,
    calculateDaysLate,
};
