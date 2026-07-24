# Osiris System Data Architecture & Sanity Schema Specification

## Document Overview
This document serves as the primary technical specification for the data structures and schema requirements integrated into the Osiris Next.js application. It is specifically intended for backend and CMS engineering teams responsible for maintaining the Sanity Studio schemas and consuming application data.

Following recent feature additions in the `feature/settings-page-updates` branch, the Osiris frontend has been expanded to collect a wide array of administrative and organizational settings. These settings are successfully persisting to the Sanity datastore via the application's API routes. However, to ensure these fields are visible and editable within the Sanity Studio dashboard, the corresponding schema definitions must be updated to match the application's data models.

---

## 1. Sanity CMS Integration

The Osiris application interfaces with Sanity via two primary API routes:
- `POST /api/settings/update-org-settings`
- `POST /api/settings/update-user-settings`

These endpoints utilize the `@sanity/client` to execute `.patch().set(updates).commit()` operations. Because the Sanity API is schemaless, the data is stored successfully. Below is the exact, comprehensive JSON structure the frontend expects and actively pushes to the datastore.

### 1.1 The `Organization` Document Schema

The `organization` document serves as the central configuration object for client profiles, scanning rules, and threat intelligence. The following fields **must be added** to the `organization` schema definition in the Sanity Studio repository.

#### Expected JSON Structure:
```json
{
  "_type": "organization",
  "organizationID": "string",
  "organizationName": "string",
  
  "industry": "string",
  "subIndustry": "string",
  "complianceFrameworks": ["string"],
  "sensitiveDataTeams": ["string"],

  "scanSettings": {
    "deepScan": "boolean",
    "scanAttachments": "boolean",
    "urlScanning": "boolean",
    "impersonationProtection": "boolean",
    "autoQuarantine": "boolean"
  },

  "peopleAndTrust": {
    "vips": [
      {
        "name": "string",
        "email": "string",
        "role": "string"
      }
    ],
    "financeApprovers": [
      {
        "name": "string",
        "email": "string",
        "role": "string"
      }
    ]


  "trustedVendors": [
    {
      "name": "string",
      "domains": ["string"],
      "category": "string"
    }
  ]
}
```

#### Field Specifications:
- **`industry` / `subIndustry`**: Standard string fields.
- **`complianceFrameworks` / `sensitiveDataTeams`**: Arrays of strings.
- **`scanSettings`**: An object containing boolean toggles for the core security engine.
- **`peopleAndTrust`**: A complex object managing internal trust mechanisms. The `vips` and `financeApprovers` arrays expect an object with `name`, `email`, and `role` properties.
- **`trustedVendors`**: An array of objects utilized by the DLP module for routing and categorization.

---

### 1.2 The `User` Document Schema

The `user` document manages individual administrator preferences. Currently, the primary expansion here pertains to notification routing.

#### Expected JSON Structure:
```json
{
  "_type": "user",
  "userEmail": "string",
  "userName": "string",
  "organizationID": "string",
  "timeZone": "string",
  
  "notificationSettings": {
    "critical": "boolean",
    "high": "boolean",
    "medium": "boolean",
    "low": "boolean",
    "weeklyReports": "boolean",
    "systemStatus": "boolean"
  }
}
```

#### Field Specifications:
- **`notificationSettings`**: An object containing boolean toggles determining the delivery of alerts to the specific user.

---

## 2. MySQL / Prisma: Audit Logs Architecture

For teams pulling analytical data or operating microservices, it is critical to note that **Audit Logs are stored in the relational MySQL database**, not within Sanity.

### 2.1 Database Schema Reference (`scannedemail` table)
```prisma
model scannedemail {
  id               String   @id @default(uuid())
  // ...
  auditLogs        String?  @db.LongText
}
```

### 2.2 Data Encryption & Formatting
The `auditLogs` column stores a **JSON stringified array** that is heavily encrypted using AES-256 GCM (`encryptStringGCM`). 

Upon decryption, the baseline structure is:
```json
[
  {
    "timestamp": "ISO-8601 Date String",
    "activity": "String",
    "activityBy": "String"
  }
]
```

### 2.3 Presentation Layer Mapping (Horus / Talon / Atlas)
To preserve historical database integrity, the backend worker queues (`workers/sanity.ts`, `workers/scanWorker.ts`) continue to persist raw system identifiers (`"System"`, `"AI Engine"`) into the `activityBy` field.

The Osiris frontend implements a dynamic mapping layer at render time to present these as our branded modules. Any external service querying the database directly must apply this identical cosmetic mapping:

1. **Horus (Detection):** Mapped when `activityBy === "AI Engine"`.
2. **Talon (Remediation):** Mapped when `activityBy === "System"` AND `activity` contains the string `"Quarantine"`. (Note: Manual administrator actions are mapped to `"Talon (Admin)"`).
3. **Atlas (Forensics):** Mapped when `activityBy === "System"` and it is NOT a quarantine action.

---

## 3. UI/UX Refinements

For comprehensive tracking, the following interface modifications were introduced to support the new data structures. These are strictly presentation-layer updates and require no backend changes:

- **Threat Log Tables:** Refactored column headers and standardized threat pill styling.
- **Incident Feed Dialog:** Deprecated legacy explanatory text regarding typosquatted tokens for improved visual density.
- **Threat Logs Filtering:** Introduced a "Quarantined" tab. This dynamically filters the primary inbound array (`inBoundMessage?.filter((t) => t.action?.toLowerCase() === "quarantined")`) without altering state structures.
- **Settings Dashboard:** Migrated to a tabbed navigation layout to support the increased volume of configuration panels.
