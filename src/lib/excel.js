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
    duplicatesList: [],
    recipients: []
  };

  const seenUniversities = new Map(); // uniKey -> { university, country }
  const seenEmails = new Map(); // email -> { university, country }

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
          const rawStr = String(val).replace(/[\u00A0\u200B\u200C\u200D]/g, " ");
          const matches = rawStr.match(EMAIL_REGEX);
          if (matches) {
            matches.forEach(m => {
              const clean = m.toLowerCase().replace(/^[^\w+]+|[^\w+]+$/g, "").trim();
              if (clean && !extractedEmails.includes(clean)) {
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
        const original = seenUniversities.get(uniKeyForSet);
        results.duplicatesList.push({
          type: "Duplicate University Name",
          university: uniNameRaw,
          email: extractedEmails.join(", "),
          country: country,
          reason: `University "${uniNameRaw}" in sheet "${country}" was already added earlier in sheet "${original.country}"`
        });
        continue;
      }

      // Filter out duplicate emails across the entire dataset
      const uniqueValidEmails = [];
      for (const email of extractedEmails) {
        if (!seenEmails.has(email)) {
          uniqueValidEmails.push(email);
          seenEmails.set(email, { university: uniNameRaw, country });
        } else {
          results.duplicateEmailsRemoved++;
          const original = seenEmails.get(email);
          results.duplicatesList.push({
            type: "Duplicate Email Address",
            university: uniNameRaw,
            email: email,
            country: country,
            reason: `Email "${email}" in sheet "${country}" (${uniNameRaw}) was already registered for "${original.university}" in sheet "${original.country}"`
          });
        }
      }

      if (uniqueValidEmails.length === 0) {
        // All extracted emails were duplicates
        continue;
      }

      seenUniversities.set(uniKeyForSet, { university: uniNameRaw, country });

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
