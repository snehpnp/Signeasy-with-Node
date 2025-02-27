const fs = require("fs");
const pdfParse = require("pdf-parse");
const { PDFDocument } = require("pdf-lib");

/**
 * Extracts text from a given PDF file.
 * @param {string} filePath - The path to the PDF file.
 * @returns {Promise<string>} - Extracted text from the PDF.
 */
const extractTextFromPDF = async (filePath) => {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(dataBuffer);
    return pdfData.text;
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    throw new Error("Failed to extract text from PDF");
  }
};

/**
 * Finds keyword positions in the PDF and maps them to coordinates.
 * @param {string} pdfPath - Path to the PDF file.
 * @param {Array<string>} keywords - List of keywords to search for.
 * @returns {Promise<Array>} - An array of objects with page numbers and coordinates.
 */
const findKeywordPositions = async (pdfPath, keywords) => {
  try {
    const dataBuffer = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(dataBuffer);
    const pages = pdfDoc.getPages();
    let positions = [];

    for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
      const page = pages[pageIndex];
      const text = (await pdfParse(dataBuffer)).text;
      keywords.forEach((keyword) => {
        let index = text.indexOf(keyword);
        if (index !== -1) {
          positions.push({
            page: pageIndex + 1, // PDF pages start from 1
            x: 100 + (index % 500), // Mock calculation, adjust as needed
            y: 700 - (index % 300), // Mock calculation, adjust as needed
          });
        }
      });
    }
    return positions;
  } catch (error) {
    console.error("Error finding keyword positions:", error);
    throw new Error("Failed to find keyword positions in PDF");
  }
};

module.exports = { extractTextFromPDF, findKeywordPositions };
