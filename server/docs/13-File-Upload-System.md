# 13 — File Upload System

A provider-agnostic file upload architecture supporting **Local disk, Cloudinary, AWS S3, Azure Blob Storage, and Google Cloud Storage** behind one interface, plus a media processing pipeline for images, documents, and videos.

## Why an abstraction over the storage provider?

Hardcoding a specific cloud provider into controllers means switching providers later (e.g. Cloudinary → S3 for cost reasons) requires touching every place that uploads a file. Instead, every provider service implements the same function signatures:

```js
upload(file, options);
delete file; // exported as `delete`, but referred to as remove internally
replace(oldFile, newFile, options);
uploadMany(files, options);
deleteMany(files);
replaceMany(oldFiles, newFiles, options);
```

`services/upload/upload.service.js` is the only entry point the rest of the app calls; it reads `STORAGE_PROVIDER` from config and delegates to the matching provider module in `services/upload/`. Controllers and services never call a provider directly.

## Providers

| Provider   | File                    | Behavior                                                                                                                                                                                                                                                                              |
| ---------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Local      | `local.service.js`      | Saves the buffered file to disk under `UPLOAD_DESTINATION`/`folder`, generating a unique filename (`crypto.randomUUID()` + original extension). Returns a relative path and a URL built from `UPLOAD_BASE_URL`. Deletion unlinks the file from disk (ignoring "already gone" errors). |
| Cloudinary | `cloudinary.service.js` | Pipes the in-memory buffer through `streamifier` into `cloudinary.uploader.upload_stream`. Returns the `secure_url` and `public_id`. Deletion calls `cloudinary.uploader.destroy` using the stored `publicId` and `resourceType`.                                                     |
| AWS S3     | `aws.service.js`        | Uploads the buffer to the configured S3 bucket/region; returns the object URL and key. Deletion removes the object by key.                                                                                                                                                            |
| Azure      | `azure.service.js`      | Uploads the buffer as a blob to the configured container; returns the blob URL. Deletion removes the blob.                                                                                                                                                                            |
| GCS        | `gcs.service.js`        | Uploads the buffer to the configured bucket; returns the public URL. Deletion removes the object.                                                                                                                                                                                     |

Every provider returns the **same shape**, matching `models/schemas/file.schema.js`:

```json
{
  "storage": "cloudinary",
  "path": null,
  "url": "https://...",
  "publicId": "users/avatar/abc123",
  "resourceType": "image",
  "filename": "abc123",
  "originalName": "photo.png",
  "mimeType": "image/png",
  "extension": "png",
  "size": 24576,
  "uploadedAt": "2026-08-02T12:00:00.000Z"
}
```

This consistent shape is why the same `file.schema.js` sub-schema can be embedded anywhere a document needs to reference an uploaded file, regardless of which provider actually stored it.

## Media Processing Pipeline

Before a file reaches a storage provider, it may pass through a processor:

```
Multer (memory buffer)
      │
      ▼
services/upload/processors/*.processor.js
      │
      ▼
services/upload/upload.service.js → active provider
```

| Processor               | Library                                            | What it does                                                                                                                                                                                                                                                                                                         |
| ----------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `image.processor.js`    | `sharp`                                            | Resizes and converts images (e.g. to `webp`) according to presets defined in `presets.js` (e.g. avatar dimensions) before upload — reduces storage size and standardizes format.                                                                                                                                     |
| `video.processor.js`    | `fluent-ffmpeg` + `ffmpeg-static`/`ffprobe-static` | Writes the buffer to a temp file, extracts metadata (`duration`, `bitrate`, `format`, `codec`, `width`, `height`, `fps`) via `ffprobe`, generates a screenshot thumbnail via `ffmpeg`, optimizes that thumbnail with `sharp` (→ `webp`), then cleans up all temp files. Returns `{ original, thumbnail, metadata }`. |
| `document.processor.js` | —                                                  | Handles document-specific pre-processing (e.g. validation, metadata extraction) before storage.                                                                                                                                                                                                                      |
| `presets.js`            | —                                                  | Central place for size/quality presets reused across processors (e.g. avatar = 256×256, thumbnail quality = 80).                                                                                                                                                                                                     |

### Video processing detail

```js
process(file):
  1. Write file.buffer to a temp file (os.tmpdir())
  2. ffprobe → extract metadata (duration, codec, resolution, fps, bitrate)
  3. ffmpeg screenshot at 1s → temp thumbnail PNG
  4. sharp: convert thumbnail → optimized webp buffer
  5. Return { original: file, thumbnail: <processed file object>, metadata }
  6. finally: delete all temp files (video + thumbnail), even on error
```

This is why video uploads (`POST /users/videos`) return both the video's storage result **and** a generated thumbnail — the thumbnail is processed and uploaded to the same provider as the original.

## Multer Layer

`config/multer.js` configures Multer with **memory storage** (buffers files in RAM rather than writing directly to disk), so the same in-memory buffer can be handed to a processor and then to any storage provider without an intermediate disk write. `middleware/upload.middleware.js` wraps this configuration for use on upload routes, attaching parsed files to `req.file` (single) or `req.files` (multiple).

## End-to-End Example: Avatar Upload

```
POST /api/v1/users/avatar (multipart/form-data)
        │
        ▼
upload.middleware.js (Multer) → req.file (buffer)
        │
        ▼
user.controller.js → user.service.js
        │
        ▼
image.processor.js → resize/convert to webp (avatar preset)
        │
        ▼
upload.service.js → active provider (e.g. cloudinary.service.js)
        │
        ▼
If replacing an existing avatar: old file deleted first (replace())
        │
        ▼
File metadata saved on User document (file.schema.js sub-schema)
        │
        ▼
ApiResponse returned with the new avatar's URL
```

## Switching Providers

Changing `STORAGE_PROVIDER` in `.env` (plus that provider's credentials) is the only step required to switch storage backends — no code changes needed in controllers, services, or processors, since they only ever talk to `upload.service.js`'s uniform interface.
