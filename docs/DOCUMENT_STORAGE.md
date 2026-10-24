# Citizen document storage

Cloudflare R2 is the private object store for uploaded files and generated PDFs. The website's FastAPI backend already implements an S3-compatible adapter in `backend/app/runtime/storage.py`; board documents, payment proofs, receipts, certificates, and data-room files call it. Vercel remains the application host and Neon remains the record database.

The former Google Drive link-only rule is retired. A document record stores its object key, filename, media type, owner or related business record, version, and review/signature state. File bytes belong in R2. Existing Google Drive links may remain as legacy references until migrated; no bulk copy or deletion should occur without checking ownership and access.

Use one private bucket per environment. All writes and reads go through authenticated backend routes that verify the caller's record-level access. Do not expose R2 credentials or direct public bucket URLs to browsers. Generated documents should use immutable versioned keys so a revised SAFE note or certificate does not overwrite signed evidence. A later backup job may copy objects to a second bucket without changing record links.

The backend requires `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, and `R2_BUCKET` (or an S3 endpoint and equivalent S3 keys). These are server-only environment variables. The website's current private deployment env file does not contain R2 settings, so uploading on that deployment is not yet verified. Use bucket-scoped credentials, keep the bucket private, and run an upload/download/access-control smoke test before production use.

The old certificate workflow still stores generated HTML in database fields and has legacy document URLs. Migrate it to R2 object keys before enabling issuance on the restored site. The Hub's existing Drive documents and cross-system sharing also need an explicit migration plan; this document does not claim those files have already moved.
