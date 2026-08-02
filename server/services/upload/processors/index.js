const imageProcessor = require("./image.processor");
const documentProcessor = require("./document.processor");
const videoProcessor = require("./video.processor");

const presets = require("./presets");

const processors = {
  image: imageProcessor,
  document: documentProcessor,
  video: videoProcessor,
};

const process = async (file, options = {}) => {
  const preset = presets[options.field];

  if (!preset) {
    return {
      original: file,
      thumbnail: null,
    };
  }

  const processor = processors[preset.type];

  if (!processor) {
    return {
      original: file,
      thumbnail: null,
    };
  }

  return processor.process(file, preset);
};

module.exports = {
  process,
};
