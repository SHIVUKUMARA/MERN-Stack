const sharp = require("sharp");

const process = async (file, options = {}) => {
  const {
    convertToWebp = false,
    quality = 80,
    stripMetadata = true,
    resize = null,
    thumbnail = null,
  } = options;

  // ORIGINAL IMAGE
  let pipeline = sharp(file.buffer).rotate();

  if (resize) {
    pipeline = pipeline.resize({
      width: resize.width,
      height: resize.height,
      fit: resize.fit ?? "inside",
      withoutEnlargement: resize.withoutEnlargement ?? true,
    });
  }

  if (convertToWebp) {
    pipeline = pipeline.webp({
      quality,
    });
  }

  if (stripMetadata) {
    // Do nothing.
    // Sharp strips metadata by default.
  } else {
    pipeline = pipeline.withMetadata();
  }

  const originalBuffer = await pipeline.toBuffer();
  const originalMetadata = await sharp(originalBuffer).metadata();
  const original = {
    ...file,
    buffer: originalBuffer,
    size: originalBuffer.length,
    originalname: convertToWebp
      ? file.originalname.replace(/\.[^.]+$/, ".webp")
      : file.originalname,
    mimetype: convertToWebp ? "image/webp" : file.mimetype,
    width: originalMetadata.width,
    height: originalMetadata.height,
    isOptimized: convertToWebp,
  };

  // THUMBNAIL
  let thumbnailFile = null;
  if (thumbnail) {
    let thumbPipeline = sharp(file.buffer)
      .rotate()
      .resize({
        width: thumbnail.width,
        height: thumbnail.height,
        fit: thumbnail.fit ?? "cover",
        withoutEnlargement: thumbnail.withoutEnlargement ?? true,
      })
      .webp({
        quality: thumbnail.quality ?? quality,
      });
    if (!stripMetadata) {
      thumbPipeline = thumbPipeline.withMetadata();
    }

    const thumbBuffer = await thumbPipeline.toBuffer();
    const thumbMetadata = await sharp(thumbBuffer).metadata();
    thumbnailFile = {
      ...file,
      buffer: thumbBuffer,
      size: thumbBuffer.length,
      originalname: file.originalname.replace(/\.[^.]+$/, "") + "_thumb.webp",
      mimetype: "image/webp",
      width: thumbMetadata.width,
      height: thumbMetadata.height,
      isOptimized: true,
    };
  }

  return {
    original,
    thumbnail: thumbnailFile,
  };
};

module.exports = {
  process,
};
