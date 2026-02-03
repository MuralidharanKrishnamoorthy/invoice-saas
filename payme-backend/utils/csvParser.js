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

function parseDate(dateString) {
    if (!dateString) return new Date();

    // Clean string
    const cleaned = dateString.trim().replace(/[/\-.]/g, '/');

    // Try YYYY/MM/DD
    if (/^\d{4}\/\d{1,2}\/\d{1,2}/.test(cleaned)) {
        return new Date(cleaned);
    }

    // Handle DD/MM/YYYY or MM/DD/YYYY
    const parts = cleaned.split('/');
    if (parts.length === 3) {
        const p1 = parseInt(parts[0]);
        const p2 = parseInt(parts[1]);
        const p3 = parseInt(parts[2]);

        // If first part > 12, it must be DD/MM/YYYY
        if (p1 > 12) {
            return new Date(p3, p2 - 1, p1);
        }

        // Otherwise, default to DD/MM/YYYY for international safety
        // But check if it's a valid year
        const year = p3 < 100 ? 2000 + p3 : p3;
        return new Date(year, p2 - 1, p1);
    }

    return new Date(dateString);
}

function calculateDaysLate(dueDate) {
    const due = parseDate(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);

    const diffTime = today - due;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

module.exports = {
    cleanCSVData,
    validateInvoiceData,
    calculateDaysLate,
};
