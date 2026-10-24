# Citizen document storage

The restored website uses a private Vercel Blob store for new uploads and generated PDFs. Its FastAPI binary-storage adapter selects Blob when `BLOB_STORE_ID` or `BLOB_READ_WRITE_TOKEN` is available. The S3 adapter remains for existing installations. Neon stores document metadata and object pathnames, not file bytes.

The former Google Drive link-only rule is retired. A document record stores its object key, filename, media type, owner or related business record, version, and review/signature state. Existing Google Drive links may remain as legacy references until migrated; no bulk copy or deletion should occur without checking ownership and access.

Store `citizen-website-private-documents` was created in the SmartMyCompany Vercel team and connected to `citizen-website-demo` for Production, Preview, and Development using Vercel OIDC. The connection supplies `BLOB_STORE_ID` without a long-lived static token. All reads and writes go through authenticated backend routes that verify record-level access. Generated documents use immutable versioned keys so revisions do not overwrite signed evidence.

A private write/read smoke test passed on 24 October 2026: the retrieved bytes matched, an unauthenticated request returned HTTP 403, and the disposable object was deleted. Before production promotion, verify these operations through the deployed FastAPI adapter and one complete subscription PDF pack.

The Hub's existing Drive documents and cross-system sharing need a separate migration plan; this document does not claim those files have moved.
