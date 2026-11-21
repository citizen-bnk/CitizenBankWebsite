# Service availability and file storage

Reviewed 21 November 2026.

## Customer recovery

Known data quota, capacity and identity-service interruptions display “Some services are temporarily unavailable”. Billing, database connection strings and provider messages are not customer-facing explanations. A support-reference disclosure retains the machine issue code for diagnosis.

The availability notice observes failed API responses without capturing request bodies or credentials. It does not replace the page or unmount open forms. Customers can dismiss it, check availability manually, or return to the public website. There is no polling loop and no automatic replay of payments, subscriptions or uploads. A successful availability check advises checking a previous request's status before resubmitting it; it does not claim that an interrupted write failed or succeeded.

Permissions, sign-in failures, incomplete KYC and an unavailable AI feature retain their own recovery paths. An outage never grants roles or bypasses authentication. Readiness continues to return HTTP 503 during a real dependency failure.

## Separate file storage

The website's active binary-storage adapter uses private Vercel Blob when BLOB_STORE_ID or BLOB_READ_WRITE_TOKEN is configured. Production has BLOB_STORE_ID configured. S3/R2 is an optional existing fallback, not the selected production adapter. Repository-hosted brand assets are served as static files.

Hub document uploads and generated PDF packs use Google Drive. Its production project has Google OAuth client configuration; the upload route saves file bytes through saveDrive and stores the returned file ID/link, digest, owner and version in document records. Signature images follow the same external-storage pattern.

File bytes are separate from Postgres database storage. Metadata, permissions, audit records and any extracted searchable text still consume database space and queries. External file storage has its own capacity and transfer limits. Uploads can still be interrupted by a database outage when the system cannot authorise access or save the document reference. Do not report an upload as complete unless the stored object and its record have both been confirmed.

This review verifies code paths and configuration presence. It does not certify a fresh production upload while the investor identity database is suspended. Retest authenticated upload, private download and record linkage after that database is available.
