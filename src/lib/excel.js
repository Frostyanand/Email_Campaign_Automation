import * as xlsx from "xlsx";

const EMAIL_REGEX = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

export function parseExcelBuffer(buffer) {
  const workbook = xlsx.read(buffer, { type: "buffer" });
  
  const results = {
    worksheets: workbook.SheetNames.length,
    universitiesFound: 0,
    validRecipients: 0,
    duplicateUniversitiesRemoved: 0,
    duplicateEmailsRemoved: 0,
    rowsIgnored: 0,
    recipients: []
  };

  const seenUniversities = new Set();
  const seenEmails = new Set();

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const country = sheetName.trim();
    
    // Parse as JSON array of objects with default value empty string
    const rows = xlsx.utils.sheet_to_json(sheet, { defval: "" });
    
    for (const row of rows) {
      // 1. Resolve University Name flexibly
      let uniNameRaw = "";
      const uniKey = Object.keys(row).find(k => 
        k.toLowerCase().includes("university") || 
        k.toLowerCase().includes("school") || 
        k.toLowerCase().includes("institution") ||
        k.toLowerCase().includes("college") ||
        k.toLowerCase().includes("name")
      );

      if (uniKey && row[uniKey]) {
        uniNameRaw = String(row[uniKey]).trim();
      } else {
        // Fallback: pick the first non-email, non-URL text cell in the row
        const firstTextVal = Object.values(row).find(v => 
          typeof v === "string" && v.trim().length > 0 && !v.includes("@") && !v.startsWith("http")
        );
        if (firstTextVal) {
          uniNameRaw = String(firstTextVal).trim();
        }
      }

      // 2. Scan ALL values in the row for valid email addresses
      const extractedEmails = [];
      Object.values(row).forEach(val => {
        if (typeof val === "string" || typeof val === "number") {
          const matches = String(val).match(EMAIL_REGEX);
          if (matches) {
            matches.forEach(m => {
              const clean = m.toLowerCase().trim();
              if (!extractedEmails.includes(clean)) {
                extractedEmails.push(clean);
              }
            });
          }
        }
      });

      if (!uniNameRaw || extractedEmails.length === 0) {
        results.rowsIgnored++;
        continue;
      }

      results.universitiesFound++;

      // Check for duplicate university across dataset
      const uniKeyForSet = uniNameRaw.toLowerCase();
      if (seenUniversities.has(uniKeyForSet)) {
        results.duplicateUniversitiesRemoved++;
        continue;
      }

      // Filter out duplicate emails across the entire dataset
      const uniqueValidEmails = [];
      for (const email of extractedEmails) {
        if (!seenEmails.has(email)) {
          uniqueValidEmails.push(email);
          seenEmails.add(email);
        } else {
          results.duplicateEmailsRemoved++;
        }
      }

      if (uniqueValidEmails.length === 0) {
        // All extracted emails were duplicates
        continue;
      }

      seenUniversities.add(uniKeyForSet);

      const toEmail = uniqueValidEmails[0];
      const ccEmails = uniqueValidEmails.slice(1);

      results.recipients.push({
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
        university: uniNameRaw,
        country: country,
        to: toEmail,
        cc: ccEmails,
        status: "Pending",
        attempts: 0,
        sentTime: null,
        error: null
      });

      results.validRecipients++;
    }
  }

  return results;
}
