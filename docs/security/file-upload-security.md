# File Upload Security — v1

Profile images, public facility images, and private verification evidence use one hardened processing model:

1. request byte-size limit;
2. allow-list JPEG/PNG/WebP;
3. binary magic-signature must match the declared MIME type;
4. decode with a maintained image decoder using a hard input-pixel ceiling;
5. reject missing/oversized dimensions and animated/multi-page input;
6. apply orientation and resize within the configured maximum output bounds;
7. re-encode to WebP without carrying source metadata;
8. generate the storage key server-side; never trust the client filename;
9. store verification evidence outside public media routes;
10. clean up a newly written object when its database transaction fails.

The pure TypeScript metadata-stripper remains only as a small independently testable utility and is not the production upload path. Production release verification must exercise the decoder/re-encoder (`sharp`) with malformed, oversized, EXIF-bearing and valid JPEG/PNG/WebP fixtures after dependencies are installed.
