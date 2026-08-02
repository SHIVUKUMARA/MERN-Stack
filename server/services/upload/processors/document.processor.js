const path = require("path");
const crypto = require("crypto");

const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const ExcelJS = require("exceljs");
const pptx2json = require("pptx2json");

const SUPPORTED_TYPES = {
  pdf: processPdf,
  docx: processWord,
  xlsx: processExcel,
  pptx: processPowerPoint,
  txt: processText,
};

async function process(file) {
  const extension = path.extname(file.originalname).slice(1).toLowerCase();

  const processor = SUPPORTED_TYPES[extension];

  if (!processor) {
    throw new Error(
      `Unsupported document type "${extension}". Supported types: pdf, docx, xlsx, pptx, txt.`,
    );
  }

  const info = await processor(file);

  return {
    original: {
      ...file,
      width: null,
      height: null,
      isOptimized: false,
    },
    thumbnail: null,
    metadata: info,
  };
}

/* -------------------------------------------------------------------------- */
/*                                   PDF                                      */
/* -------------------------------------------------------------------------- */

async function processPdf(file) {
  const pdf = await pdfParse(file.buffer);

  return {
    type: "pdf",
    pages: pdf.numpages,
    words: pdf.text.trim().split(/\s+/).length,
    characters: pdf.text.length,
    preview: pdf.text.substring(0, 500),
    sha256: sha256(file.buffer),
  };
}

/* -------------------------------------------------------------------------- */
/*                                  DOCX                                      */
/* -------------------------------------------------------------------------- */

async function processWord(file) {
  const { value } = await mammoth.extractRawText({
    buffer: file.buffer,
  });

  return {
    type: "docx",
    words: value.trim().split(/\s+/).length,
    characters: value.length,
    paragraphs: value.split(/\n\s*\n/).length,
    preview: value.substring(0, 500),
    sha256: sha256(file.buffer),
  };
}

/* -------------------------------------------------------------------------- */
/*                                  XLSX                                      */
/* -------------------------------------------------------------------------- */

async function processExcel(file) {
  const workbook = new ExcelJS.Workbook();

  await workbook.xlsx.load(file.buffer);

  const sheets = workbook.worksheets.map((sheet) => ({
    name: sheet.name,
    rows: sheet.rowCount,
    columns: sheet.columnCount,
  }));

  return {
    type: "xlsx",
    sheetCount: workbook.worksheets.length,
    sheets,
    sha256: sha256(file.buffer),
  };
}

/* -------------------------------------------------------------------------- */
/*                                  PPTX                                      */
/* -------------------------------------------------------------------------- */

async function processPowerPoint(file) {
  const presentation = await pptx2json(file.buffer);

  return {
    type: "pptx",
    slides: presentation.slides?.length || 0,
    title: presentation.title || null,
    author: presentation.author || null,
    sha256: sha256(file.buffer),
  };
}

/* -------------------------------------------------------------------------- */
/*                                   TXT                                      */
/* -------------------------------------------------------------------------- */

async function processText(file) {
  const text = file.buffer.toString("utf8");

  return {
    type: "txt",
    lines: text.split(/\r?\n/).length,
    words: text.trim().split(/\s+/).length,
    characters: text.length,
    preview: text.substring(0, 500),
    sha256: sha256(file.buffer),
  };
}

/* -------------------------------------------------------------------------- */

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

module.exports = {
  process,
};
