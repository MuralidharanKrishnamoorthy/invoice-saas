export function validateCSVRow(row, rowIndex) {
    const errors = [];

    // Required fields
    const requiredFields = ['Invoice', 'Client', 'Email', 'Amount', 'Due'];
    requiredFields.forEach((field) => {
        const value = row[field] || row[field.toLowerCase()];
        if (!value || value.trim() === '') {
            errors.push(`Row ${rowIndex + 1}: Missing ${field}`);
        }
    });

    // Email validation
    const email = row.Email || row.email;
    if (email && !isValidEmail(email)) {
        errors.push(`Row ${rowIndex + 1}: Invalid email format`);
    }

    // Amount validation
    const amount = row.Amount || row.amount;
    if (amount && (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0)) {
        errors.push(`Row ${rowIndex + 1}: Invalid amount`);
    }

    // Date validation
    const due = row.Due || row.due;
    if (due && !isValidDate(due)) {
        errors.push(`Row ${rowIndex + 1}: Invalid date format`);
    }

    return errors;
}

export function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

export function isValidDate(dateString) {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
}

export function sanitizeInput(input) {
    if (typeof input !== 'string') return input;

    // Remove potential XSS attacks
    return input
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}

// Map currency codes to symbols
export function getCurrencySymbol(currencyCode) {
    const currencyMap = {
        'USD': '$',
        'INR': '₹',
        'EUR': '€',
        'GBP': '£',
        'JPY': '¥',
        'CNY': '¥',
        'AUD': 'A$',
        'CAD': 'C$',
        'CHF': 'CHF',
        'SEK': 'kr',
        'NZD': 'NZ$',
        'SGD': 'S$',
        'HKD': 'HK$',
        'NOK': 'kr',
        'KRW': '₩',
        'TRY': '₺',
        'RUB': '₽',
        'BRL': 'R$',
        'ZAR': 'R',
        'MXN': 'Mex$',
    };
    return currencyMap[currencyCode?.toUpperCase()] || currencyCode || '$';
}

export function formatCurrency(amount, currencyCode = 'USD') {
    const symbol = getCurrencySymbol(currencyCode);
    const locale = currencyCode === 'INR' ? 'en-IN' : 'en-US';
    return `${symbol}${parseFloat(amount).toLocaleString(locale)}`;
}

export function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

export function calculateDaysLate(dueDate) {
    const due = new Date(dueDate);
    const today = new Date();
    const diff = Math.floor((today - due) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
}
