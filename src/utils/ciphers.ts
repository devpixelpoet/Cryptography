import { CipherType } from "../types";

/**
 * Caesar Cipher implementation
 */
export const caesarCipher = (
  text: string,
  shift: number,
  mode: "encrypt" | "decrypt",
): string => {
  if (isNaN(shift))
    throw new Error("Caesar shifri uchun kalit butun son bo'lishi shart.");

  const s =
    mode === "encrypt"
      ? ((shift % 26) + 26) % 26
      : (26 - (((shift % 26) + 26) % 26)) % 26;
  return text
    .split("")
    .map((char) => {
      if (char.match(/[a-z]/i)) {
        const code = char.charCodeAt(0);
        const base = code >= 65 && code <= 90 ? 65 : 97;
        return String.fromCharCode(((code - base + s) % 26) + base);
      }
      return char;
    })
    .join("");
};

/**
 * Rail Fence Cipher implementation
 */
export const railFenceEncrypt = (text: string, rails: number): string => {
  if (isNaN(rails) || rails < 2)
    throw new Error(
      'Rail Fence uchun "rail"lar soni kamida 2 bo\'lishi kerak.',
    );

  const fence: string[][] = Array.from({ length: rails }, () => []);
  let rail = 0;
  let direction = 1;

  for (const char of text) {
    fence[rail].push(char);
    rail += direction;
    if (rail === 0 || rail === rails - 1) direction *= -1;
  }

  return fence.flat().join("");
};

export const railFenceDecrypt = (cipherText: string, rails: number): string => {
  if (isNaN(rails) || rails < 2)
    throw new Error(
      'Rail Fence uchun "rail"lar soni kamida 2 bo\'lishi kerak.',
    );
  if (!cipherText) return "";

  const fence: (string | null)[][] = Array.from({ length: rails }, () =>
    new Array(cipherText.length).fill(null),
  );

  let rail = 0;
  let direction = 1;
  for (let i = 0; i < cipherText.length; i++) {
    fence[rail][i] = "*";
    rail += direction;
    if (rail === 0 || rail === rails - 1) direction *= -1;
  }

  let index = 0;
  for (let r = 0; r < rails; r++) {
    for (let c = 0; c < cipherText.length; c++) {
      if (fence[r][c] === "*" && index < cipherText.length) {
        fence[r][c] = cipherText[index++];
      }
    }
  }

  let result = "";
  rail = 0;
  direction = 1;
  for (let i = 0; i < cipherText.length; i++) {
    result += fence[rail][i];
    rail += direction;
    if (rail === 0 || rail === rails - 1) direction *= -1;
  }
  return result;
};

/**
 * Columnar Transposition Cipher implementation (Keyword version)
 * The alphabetical order of the letters in the keyword determines the reading order of columns.
 */
export const columnarTranspositionEncrypt = (
  text: string,
  key: string,
): string => {
  const sanitizedKey = key.toUpperCase().replace(/[^A-Z]/g, "");
  if (!sanitizedKey)
    throw new Error(
      "Transposition kaliti kamida bitta lotin harfidan iborat bo'lishi shart.",
    );

  const numCols = sanitizedKey.length;
  const numRows = Math.ceil(text.length / numCols);

  // Create column order based on alphabetical sorting of the keyword
  const keyArr = sanitizedKey.split("").map((char, index) => ({ char, index }));
  keyArr.sort((a, b) => a.char.localeCompare(b.char) || a.index - b.index);

  const grid: string[][] = Array.from({ length: numRows }, () =>
    new Array(numCols).fill(""),
  );

  // Fill grid row by row
  for (let i = 0; i < text.length; i++) {
    grid[Math.floor(i / numCols)][i % numCols] = text[i];
  }

  // Read grid column by column in the keyword order
  let result = "";
  for (const k of keyArr) {
    const colIndex = k.index;
    for (let row = 0; row < numRows; row++) {
      if (grid[row][colIndex] !== "") {
        result += grid[row][colIndex];
      }
    }
  }
  return result;
};

export const columnarTranspositionDecrypt = (
  cipherText: string,
  key: string,
): string => {
  const sanitizedKey = key.toUpperCase().replace(/[^A-Z]/g, "");
  if (!sanitizedKey)
    throw new Error(
      "Transposition kaliti kamida bitta lotin harfidan iborat bo'lishi shart.",
    );

  const numCols = sanitizedKey.length;
  const len = cipherText.length;
  const numRows = Math.ceil(len / numCols);
  const fullCols = len % numCols;

  // Key order
  const keyArr = sanitizedKey.split("").map((char, index) => ({ char, index }));
  keyArr.sort((a, b) => a.char.localeCompare(b.char) || a.index - b.index);

  const grid: string[][] = Array.from({ length: numRows }, () =>
    new Array(numCols).fill(""),
  );

  let charIndex = 0;
  // Fill the grid column by column following the keyword order
  for (const k of keyArr) {
    const colIndex = k.index;
    const colLen =
      fullCols === 0 || colIndex < fullCols ? numRows : numRows - 1;

    for (let row = 0; row < colLen; row++) {
      if (charIndex < len) {
        grid[row][colIndex] = cipherText[charIndex++];
      }
    }
  }

  // Read grid row by row to get original message
  let result = "";
  for (let row = 0; row < numRows; row++) {
    for (let col = 0; col < numCols; col++) {
      result += grid[row][col];
    }
  }
  return result;
};

/**
 * Playfair Cipher implementation
 */
export const preparePlayfairText = (text: string): string => {
  let res = text
    .toUpperCase()
    .replace(/J/g, "I")
    .replace(/[^A-Z]/g, "");
  if (!res)
    throw new Error(
      "Playfair shifrlash uchun kamida bitta harf bo'lishi shart.",
    );

  let prepared = "";
  for (let i = 0; i < res.length; i++) {
    prepared += res[i];
    // If the current length is odd, we are looking for the second character of a pair.
    // If that second character is identical to the first, we insert 'X'.
    if (prepared.length % 2 !== 0) {
      if (i + 1 < res.length && res[i] === res[i + 1]) {
        prepared += "X";
      }
    }
  }

  // If the total length is still odd, pad with 'X'.
  if (prepared.length % 2 !== 0) {
    prepared += "X";
  }

  return prepared;
};

export const createPlayfairMatrix = (key: string): string[][] => {
  const alphabet = "ABCDEFGHIKLMNOPQRSTUVWXYZ";
  const sanitizedKey = (
    key.toUpperCase().replace(/J/g, "I") + alphabet
  ).replace(/[^A-Z]/g, "");

  if (!sanitizedKey.length) {
    throw new Error("Playfair kaliti noto'g'ri formatda.");
  }

  const uniqueChars = Array.from(new Set(sanitizedKey.split("")));
  const matrix: string[][] = [];
  for (let i = 0; i < 5; i++) {
    matrix.push(uniqueChars.slice(i * 5, i * 5 + 5));
  }
  return matrix;
};

export const playfairCipher = (
  text: string,
  key: string,
  mode: "encrypt" | "decrypt",
): string => {
  const matrix = createPlayfairMatrix(key);
  const findPos = (char: string) => {
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (matrix[r][c] === char) return [r, c];
      }
    }
    throw new Error(`Belgi matritsada topilmadi: ${char}`);
  };

  const prepared =
    mode === "encrypt"
      ? preparePlayfairText(text)
      : text
          .toUpperCase()
          .replace(/J/g, "I")
          .replace(/[^A-Z]/g, "");

  if (mode === "decrypt") {
    if (!prepared)
      throw new Error("Deshifrlash uchun harfli matn kiritilmagan.");
    if (prepared.length % 2 !== 0) {
      throw new Error(
        "Playfair deshifrlash uchun harflar soni juft bo'lishi shart.",
      );
    }
  }

  let result = "";
  for (let i = 0; i < prepared.length; i += 2) {
    const [r1, c1] = findPos(prepared[i]);
    const [r2, c2] = findPos(prepared[i + 1]);

    if (r1 === r2) {
      const shift = mode === "encrypt" ? 1 : 4;
      result += matrix[r1][(c1 + shift) % 5] + matrix[r2][(c2 + shift) % 5];
    } else if (c1 === c2) {
      const shift = mode === "encrypt" ? 1 : 4;
      result += matrix[(r1 + shift) % 5][c1] + matrix[(r2 + shift) % 5][c2];
    } else {
      result += matrix[r1][c2] + matrix[r2][c1];
    }
  }
  return result;
};
