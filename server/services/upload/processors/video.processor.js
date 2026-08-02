const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
const ffprobePath = require("ffprobe-static").path;

const sharp = require("sharp");
const path = require("path");
const os = require("os");
const fs = require("fs/promises");
const { existsSync } = require("fs");
const crypto = require("crypto");

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

const TMP_DIR = os.tmpdir();

const createTempFile = async (buffer, extension) => {
  const filename = `${crypto.randomUUID()}.${extension}`;
  const filepath = path.join(TMP_DIR, filename);

  await fs.writeFile(filepath, buffer);

  return filepath;
};

const deleteTempFile = async (filepath) => {
  try {
    if (filepath && existsSync(filepath)) {
      await fs.unlink(filepath);
    }
  } catch (_) {}
};

const getMetadata = (videoPath) =>
  new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) return reject(err);

      const video = metadata.streams.find(
        (stream) => stream.codec_type === "video",
      );

      resolve({
        duration: metadata.format.duration
          ? Number(metadata.format.duration.toFixed(2))
          : null,

        bitrate: metadata.format.bit_rate
          ? Number(metadata.format.bit_rate)
          : null,

        format: metadata.format.format_name || null,

        codec: video?.codec_name || null,

        width: video?.width || null,

        height: video?.height || null,

        fps: (() => {
          if (!video?.avg_frame_rate) return null;

          const [a, b] = video.avg_frame_rate.split("/");

          return b == 0 ? null : Number((a / b).toFixed(2));
        })(),
      });
    });
  });

const createThumbnail = (videoPath, outputPath) =>
  new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .screenshots({
        timestamps: ["1"],
        filename: path.basename(outputPath),
        folder: path.dirname(outputPath),
        size: "640x?",
      })
      .on("end", resolve)
      .on("error", reject);
  });

const process = async (file) => {
  const extension = path.extname(file.originalname).replace(".", "");

  const tempVideo = await createTempFile(file.buffer, extension);

  const tempThumbnail = path.join(TMP_DIR, `${crypto.randomUUID()}.png`);

  try {
    const metadata = await getMetadata(tempVideo);

    await createThumbnail(tempVideo, tempThumbnail);

    let thumbnail = null;

    try {
      const thumbBuffer = await sharp(tempThumbnail)
        .webp({
          quality: 80,
        })
        .toBuffer();

      const thumbMetadata = await sharp(thumbBuffer).metadata();

      thumbnail = {
        fieldname: file.fieldname,
        originalname: path.parse(file.originalname).name + "_thumb.webp",
        encoding: file.encoding,
        mimetype: "image/webp",
        buffer: thumbBuffer,
        size: thumbBuffer.length,
        width: thumbMetadata.width,
        height: thumbMetadata.height,
        isOptimized: true,
      };
    } catch (_) {}

    return {
      original: file,
      thumbnail,
      metadata,
    };
  } finally {
    await deleteTempFile(tempVideo);
    await deleteTempFile(tempThumbnail);
  }
};

module.exports = {
  process,
};
