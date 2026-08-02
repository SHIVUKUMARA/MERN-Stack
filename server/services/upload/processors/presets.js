module.exports = {
  avatar: {
    type: "image",

    convertToWebp: true,

    quality: 80,

    stripMetadata: true,

    resize: {
      width: 512,
      height: 512,
      fit: "cover",
      withoutEnlargement: true,
    },

    thumbnail: {
      width: 150,
      height: 150,
      fit: "cover",
      quality: 70,
      withoutEnlargement: true,
    },
  },

  gallery: {
    type: "image",

    convertToWebp: true,

    quality: 85,

    stripMetadata: true,

    resize: {
      width: 1920,
      fit: "inside",
      withoutEnlargement: true,
    },

    thumbnail: null,
  },

  documents: {
    type: "document",
  },

  videos: {
    type: "video",

    extractMetadata: true,

    generateThumbnail: true,

    thumbnail: {
      width: 320,
      height: 180,
      quality: 80,
    },
  },
};
