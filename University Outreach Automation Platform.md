University Outreach Automation Platform
Project Context

Develop a complete internal web application for our company to automate university outreach emails.

Currently, our team manually sends hundreds of personalized emails to universities, which takes approximately 15 to 16 hours per campaign.

The goal of this project is to reduce this process to a few minutes of setup followed by fully automated email delivery.

This is an internal tool only.

It is not a SaaS product.

There is only one administrator.

The project should prioritize simplicity, reliability, clean architecture, and production readiness over unnecessary complexity.

The final project must run perfectly on localhost and deploy directly to Vercel without build errors, lint errors, runtime issues, or TypeScript-related problems.

Primary Goal

The application should allow the user to:

Login
Upload an Excel workbook
Parse every worksheet
Extract university names and email addresses
Display all extracted recipients
Choose an email template
Choose attachments
Configure sending interval
Automatically personalize every email
Send emails one-by-one through Titan SMTP
Show live campaign progress
Retry failed emails
Finish with a complete campaign report

No database is required.

Everything exists only during the current session.

Technology Stack

Framework

Next.js (latest stable)
App Router

Language

JavaScript ONLY
Absolutely NO TypeScript
Do not generate tsconfig.json
No .ts or .tsx files
Everything must be .js and .jsx

Styling

TailwindCSS
shadcn/ui
Lucide React
Framer Motion (only for subtle animations)

Libraries

nodemailer
xlsx
bcryptjs
jsonwebtoken
cookie
zod
react-hook-form
dotenv
html-to-text

Deployment

Vercel

Do not use

Prisma
MongoDB
Firebase
PostgreSQL
MySQL
Redis
BullMQ
RabbitMQ
Zustand
Redux
Supabase
Clerk
NextAuth
Authentication

Simple admin authentication.

No user system.

Store credentials inside .env.

ADMIN_EMAIL=

ADMIN_PASSWORD_HASH=

Password stored only as bcrypt hash.

Login verifies credentials.

Issue JWT.

Store JWT inside HTTP-only cookie.

Protect dashboard.

Logout clears cookie.

Application Pages
/

If authenticated

↓

Dashboard

Otherwise

↓

Login

/login

Modern clean login page.

Fields

Email
Password

Button

Login

Display loading state.

Display invalid credential errors.

/dashboard

Contains

Excel Upload
Campaign Summary
Recipient Table
Template Selector
Attachment Selector
Interval Settings
Campaign Controls
Progress Dashboard

Everything exists on one page.

Excel Processing

User uploads one Excel workbook.

Supported formats

xlsx
xls

Maximum size

20MB

Parse every worksheet.

Every worksheet represents one country.

Country name equals worksheet name.

Example

Georgia

↓

Recipient country

Georgia

Each row represents one university.

Required data

University Name
Email(s)

Ignore every other column.

University name comes from

Name of University

Email column may contain

One email

Example

info@abc.edu

Or multiple emails

info@abc.edu,
international@abc.edu

Or malformed data

info@abc.edu,
https://website.com,
another@email.com

Parser must extract ONLY valid emails using regex.

Suggested regex

[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}

Ignore everything else.

Recipient Rules

If only one email exists

TO

first email

CC

none

If multiple emails exist

TO

first email

CC

remaining emails

Remove duplicate CC addresses.

Remove duplicate TO addresses.

Ignore invalid emails.

Ignore empty rows.

Ignore rows with no valid email.

If duplicate university appears

Keep first occurrence.

Campaign Object

Each recipient should contain

id

university

country

to

cc[]

status

attempts

sentTime

error

Status values

Pending
Waiting
Sending
Sent
Failed
Retrying
Skipped
Campaign Summary

Immediately after parsing

Show

Workbook Name

Number of Worksheets

Universities Found

Valid Recipients

Duplicate Universities Removed

Duplicate Emails Removed

Rows Ignored

Ready To Send

Recipient Table

Columns

University

Country

To

CC

Status

Checkbox

Users can manually disable recipients before sending.

Search bar

Search by

University
Country
Email
Template System

Templates stored locally.

Folder

/templates

Each template

HTML file

JSON metadata

Metadata

Name

Subject

Description

Default Attachments

Supported placeholders

{{UNIVERSITY_NAME}}

{{COUNTRY}}

{{TO_EMAIL}}

{{CURRENT_DATE}}

{{COMPANY_NAME}}

{{SENDER_NAME}}

Placeholders replaced immediately before sending.

Attachments

Folder

/attachments

Contains static company PDFs.

Template selects default attachments.

Dashboard allows enabling/disabling attachments.

No upload functionality.

SMTP

Company uses GoDaddy Titan Email.

Use Nodemailer.

SMTP configuration comes from environment variables.

SMTP_HOST

SMTP_PORT

SMTP_SECURE

SMTP_USER

SMTP_PASS

Verify SMTP connection before campaign begins.

If SMTP verification fails

Prevent campaign start.

Display error.

Campaign Controls

Buttons

Start

Pause

Resume

Stop

Reset

Retry Failed

Only one campaign may run at a time.

Sending Engine

Browser controls timing.

Browser never accesses SMTP credentials.

Every interval

↓

Call

POST /api/send-email

API sends ONE email only.

Returns

Success

Failure

Timestamp

Error

Frontend updates recipient status.

Waits until next interval.

Interval Settings

User chooses

30 seconds

1 minute

2 minutes

5 minutes

10 minutes

Custom value

To avoid robotic behavior

Add random delay

±10%

Example

User selects

120 seconds

Actual delay

Between

108 and 132 seconds

Randomized for every email.

Retry Logic

If SMTP fails

Retry automatically.

Maximum retries

3

Retry delays

Attempt 2

30 seconds

Attempt 3

60 seconds

Attempt 4

120 seconds

If still failing

Status

Failed

Store error message.

Retry Failed button

Creates a new queue using only failed recipients.

Campaign State Machine

States

Idle

↓

Ready

↓

Running

↓

Paused

↓

Completed

↓

Cancelled

↓

Error

Buttons enabled only when appropriate.

Prevent duplicate campaigns.

Prevent multiple Start clicks.

Progress Dashboard

Large animated progress bar.

Statistics

Total

Pending

Sending

Sent

Failed

Retrying

Skipped

Elapsed Time

Estimated Remaining

Live updates after every email.

Completion Report

After campaign finishes

Show

Total Sent

Total Failed

Total Skipped

Total Duration

Average Send Time

Retry Count

Allow exporting report as CSV.

API Routes
POST /api/login

POST /api/logout

GET /api/check-auth

POST /api/upload

POST /api/send-email

Every API must

Validate input.

Return proper HTTP status codes.

Never expose stack traces.

Never expose SMTP credentials.

Folder Structure
app/

login/

dashboard/

api/

components/

lib/

templates/

attachments/

public/

styles/
UI Design

Dark mode only.

Professional.

Fast.

Minimal.

Modern cards.

Rounded corners.

Blue accent.

Responsive.

Loading skeletons.

Toast notifications.

Smooth but lightweight animations.

Error Handling

Handle

Invalid login

Invalid Excel

No valid recipients

SMTP failure

Attachment missing

Template missing

Network failure

JWT expiration

Unexpected API error

Display user-friendly messages.

Never crash.

Security

HTTP-only cookies

Secure JWT

Environment variables only

Never expose SMTP credentials

Validate every request

Validate uploaded files

Validate attachment paths

Sanitize template replacement values

No dynamic code execution

Coding Standards
JavaScript only
Functional React components
Clean reusable components
Modular architecture
Async/await everywhere
Proper try/catch blocks
No duplicated logic
No unused variables
No console.log in production
No ESLint warnings
No build warnings
No lint errors
No dead code
Follow consistent naming conventions
Keep components focused on a single responsibility
Development Requirements

Develop the entire project end-to-end autonomously.

Do not leave placeholders, TODOs, mock implementations, or partially completed features.

Implement every feature described above.

Ensure the application:

Runs correctly on localhost with npm install followed by npm run dev.
Builds successfully with npm run build.
Produces zero ESLint errors or warnings.
Deploys successfully on Vercel without requiring code changes.
Uses only environment variables for secrets and sensitive configuration.
Includes a clear .env.example file documenting every required variable.
Includes a concise README.md with setup, development, build, deployment, and Titan SMTP configuration instructions.

When multiple implementation approaches exist, prefer the simplest, most maintainable solution that satisfies the requirements. Avoid introducing unnecessary dependencies, abstractions, or infrastructure for this internal automation tool. The finished application should feel polished, reliable, and immediately usable with minimal manual intervention after cloning the repository.