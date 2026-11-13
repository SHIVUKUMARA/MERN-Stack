// const ffmpeg = require("fluent-ffmpeg");
// const ffmpegPath = require("ffmpeg-static");
// const ffprobePath = require("ffprobe-static").path;

// const sharp = require("sharp");
// const path = require("path");
// const os = require("os");
// const fs = require("fs/promises");
// const { existsSync } = require("fs");
// const crypto = require("crypto");

// ffmpeg.setFfmpegPath(ffmpegPath);
// ffmpeg.setFfprobePath(ffprobePath);

// const TMP_DIR = os.tmpdir();

// const createTempFile = async (buffer, extension) => {
//   const filename = `${crypto.randomUUID()}.${extension}`;
//   const filepath = path.join(TMP_DIR, filename);
//   await fs.writeFile(filepath, buffer);
//   return filepath;
// };

// const deleteTempFile = async (filepath) => {
//   try {
//     if (filepath && existsSync(filepath)) {
//       await fs.unlink(filepath);
//     }
//   } catch {
//     // Ignore cleanup errors.
//   }
// };

// const getMetadata = (videoPath) =>
//   new Promise((resolve, reject) => {
//     ffmpeg.ffprobe(videoPath, (err, metadata) => {
//       if (err) return reject(err);
//       const video = metadata.streams.find(
//         (stream) => stream.codec_type === "video",
//       );

//       resolve({
//         duration: metadata.format.duration
//           ? Number(metadata.format.duration.toFixed(2))
//           : null,
//         bitrate: metadata.format.bit_rate
//           ? Number(metadata.format.bit_rate)
//           : null,
//         format: metadata.format.format_name || null,
//         codec: video?.codec_name || null,
//         width: video?.width || null,
//         height: video?.height || null,
//         fps: (() => {
//           if (!video?.avg_frame_rate) return null;
//           const [a, b] = video.avg_frame_rate.split("/");
//           return b == 0 ? null : Number((a / b).toFixed(2));
//         })(),
//       });
//     });
//   });

// const createThumbnail = (videoPath, outputPath) =>
//   new Promise((resolve, reject) => {
//     ffmpeg(videoPath)
//       .screenshots({
//         timestamps: ["1"],
//         filename: path.basename(outputPath),
//         folder: path.dirname(outputPath),
//         size: "640x?",
//       })
//       .on("end", resolve)
//       .on("error", reject);
//   });

// const process = async (file) => {
//   const extension = path.extname(file.originalname).replace(".", "");
//   const tempVideo = await createTempFile(file.buffer, extension);
//   const tempThumbnail = path.join(TMP_DIR, `${crypto.randomUUID()}.png`);
//   try {
//     const metadata = await getMetadata(tempVideo);
//     await createThumbnail(tempVideo, tempThumbnail);
//     let thumbnail = null;
//     try {
//       const thumbBuffer = await sharp(tempThumbnail)
//         .webp({
//           quality: 80,
//         })
//         .toBuffer();
//       const thumbMetadata = await sharp(thumbBuffer).metadata();
//       thumbnail = {
//         fieldname: file.fieldname,
//         originalname: path.parse(file.originalname).name + "_thumb.webp",
//         encoding: file.encoding,
//         mimetype: "image/webp",
//         buffer: thumbBuffer,
//         size: thumbBuffer.length,
//         width: thumbMetadata.width,
//         height: thumbMetadata.height,
//         isOptimized: true,
//       };
//     } catch {
//       // Thumbnail generation failure should not fail video processing.
//     }
//     return {
//       original: file,
//       thumbnail,
//       metadata,
//     };
//   } finally {
//     await deleteTempFile(tempVideo);
//     await deleteTempFile(tempThumbnail);
//   }
// };

// module.exports = {
//   process,
// };

const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
const ffprobePath = require("ffprobe-static").path;

const sharp = require("sharp");
const path = require("path");
const os = require("os");
const fs = require("fs/promises");
const crypto = require("crypto");

if (!ffmpegPath || !ffprobePath) {
  throw new Error("FFmpeg or FFprobe binary is unavailable.");
}

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

const TMP_DIR = os.tmpdir();

const deleteTempFile = async (filepath) => {
  try {
    if (filepath) {
      await fs.unlink(filepath);
    }
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("Failed to delete temporary video file:", error);
    }
  }
};

const getMetadata = (videoPath) =>
  new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (error, metadata) => {
      if (error) return reject(error);

      const video = metadata.streams?.find(
        (stream) => stream.codec_type === "video",
      );

      const [numerator, denominator] = (video?.avg_frame_rate || "0/0").split(
        "/",
      );

      resolve({
        duration: metadata.format?.duration
          ? Number(Number(metadata.format.duration).toFixed(2))
          : null,
        bitrate: metadata.format?.bit_rate
          ? Number(metadata.format.bit_rate)
          : null,
        format: metadata.format?.format_name || null,
        codec: video?.codec_name || null,
        width: video?.width || null,
        height: video?.height || null,
        fps:
          Number(denominator) > 0
            ? Number((numerator / denominator).toFixed(2))
            : null,
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
  if (!file?.path) {
    throw new Error("Video file path is required.");
  }

  const tempThumbnail = path.join(TMP_DIR, `${crypto.randomUUID()}.png`);

  try {
    const metadata = await getMetadata(file.path);

    await createThumbnail(file.path, tempThumbnail);

    let thumbnail = null;

    try {
      const thumbBuffer = await sharp(tempThumbnail)
        .webp({ quality: 80 })
        .toBuffer();

      const thumbMetadata = await sharp(thumbBuffer).metadata();

      thumbnail = {
        fieldname: file.fieldname,
        originalname: `${path.parse(file.originalname).name}_thumb.webp`,
        encoding: file.encoding,
        mimetype: "image/webp",
        buffer: thumbBuffer,
        size: thumbBuffer.length,
        width: thumbMetadata.width,
        height: thumbMetadata.height,
        isOptimized: true,
      };
    } catch (error) {
      // Thumbnail generation failure should not fail video processing.
      console.error("Video thumbnail generation failed:", error);
    }

    return {
      original: file,
      thumbnail,
      metadata,
    };
  } finally {
    await deleteTempFile(tempThumbnail);
  }
};

module.exports = {
  process,
};
