# Invoice Upload Testing Guide

## ✅ Your Claude Pro Invoice SHOULD Work Now!

### What Changed
The AI now understands **invoice direction**:
- If you're the **seller** → Extracts client info from "Bill To"
- If you're the **buyer** (like Claude invoice) → Extracts YOUR info as the "client"

### Your Claude Invoice Should Extract:
```json
{
  "invoice_number": "AKQX0CCL-0025",
  "client_name": "claudeai2005@gmail.com's Organization",
  "client_email": "claudeai2005@gmail.com",
  "amount": 23.60,
  "due_date": "2026-01-11"
}
```

---

## 🧪 Test Cases

### Test 1: Your Claude Invoice (Buyer Invoice)
**File**: Your Claude Pro invoice PDF
**Expected Result**: ✅ Should extract your email as "client"

### Test 2: Invoice You Send (Seller Invoice)
**Example**:
```
Invoice #: INV-001
Date: Jan 28, 2026
Due: Feb 28, 2026

Bill To:
John Doe
john@example.com

Amount: $500.00
```
**Expected Result**: ✅ Should extract John's info

### Test 3: Excel/CSV Format
**Example CSV**:
```csv
Invoice Number,Client Name,Client Email,Amount,Due Date
INV-001,ABC Corp,abc@corp.com,1000,2026-02-15
INV-002,XYZ Ltd,xyz@ltd.com,2000,2026-03-01
```
**Expected Result**: ✅ Should extract both rows

---

## 🐛 Troubleshooting

### Error: "No valid invoice data found"

**Possible Causes**:
1. **OpenAI API Key not set** → Check `.env` file
2. **PDF parsing failed** → Check if PDF is text-based (not scanned image)
3. **Missing required fields** → Invoice must have at least invoice #, name, and amount

**How to Debug**:
```bash
# Check backend logs
# Look for these lines:
📄 Processing file: invoice.pdf
✅ Parsed PDF - Extracted X characters
🤖 Sending to AI for extraction...
✅ AI extracted X invoice(s)
```

### If Still Failing

**Check the raw extracted text**:
Add this to `routes/invoices.js` after line 40:
```javascript
console.log('📝 Raw extracted text:', rawData.substring(0, 500));
```

This will show you what text was extracted from the PDF.

---

## 📋 Required Fields

For an invoice to be valid, it MUST have:
1. ✅ Invoice Number (any format)
2. ✅ Client Name (person or company)
3. ✅ Amount (number)

Optional but recommended:
4. ⚠️ Client Email (helps with automation)
5. ⚠️ Due Date (for tracking)

---

## 🎯 Supported Formats

### ✅ Fully Supported
- **PDF** (text-based, not scanned images)
- **Excel** (.xlsx, .xls)
- **CSV** (.csv)

### ⚠️ Partially Supported
- **Scanned PDFs** (requires OCR - not implemented)
- **Images** (JPG, PNG - not supported)

### ❌ Not Supported
- Handwritten invoices (image)
- Encrypted PDFs
- Password-protected files

---

## 💡 Tips for Best Results

### For PDFs
- Use text-based PDFs (not scanned images)
- Ensure text is selectable
- Clear, structured layout works best

### For Excel
- Put data in first sheet
- Use clear column headers
- One invoice per row

### For CSV
- Include headers
- Use standard field names
- Comma-separated values

---

## 🔧 Quick Fix Commands

### Restart Backend (if changes not reflecting)
```bash
# Stop current server (Ctrl+C in terminal)
# Then restart:
npm start
```

### Check OpenAI API Key
```bash
# In .env file, verify:
OPENAI_API_KEY=sk-...your-key...
```

### Test with Sample Invoice
Create a simple text file `test-invoice.txt`:
```
Invoice Number: TEST-001
Bill To: Test Client
Email: test@example.com
Amount: $100.00
Due Date: 2026-02-01
```

Save as PDF and upload!

---

## 📞 Still Having Issues?

1. Check backend terminal for error messages
2. Verify OpenAI API key is valid
3. Try a simpler invoice format first
4. Check if PDF text is extractable (try copy-paste from PDF)

---

## ✅ Success Indicators

You'll know it worked when you see:
1. ✅ "Successfully processed X files and extracted Y invoices"
2. ✅ Invoice appears in dashboard
3. ✅ Client auto-created in clients list
4. ✅ Email chasing scheduled

**Now try uploading your Claude invoice again! It should work! 🎉**
