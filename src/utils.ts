// Convert 32 bytes of hex to Uint8Array, undefined for other sizes
//
// lol I'm going to regret this but this overoptimized code is the result of:
// https://chat.openai.com/share/ae1e8813-ac3d-4262-89c7-14c462febb34
// I'm so sorry.
function PUSH32toArray(hex: string): Uint8Array {
  const uint8Array = new Uint8Array(32);

  for (let i = 0; i < 64; i += 2) {
    const highNibble = hex.charCodeAt(i) - 48;
    const lowNibble = hex.charCodeAt(i + 1) - 48;
    uint8Array[i / 2] = (((highNibble + (9 < highNibble ? 39 : 0)) & 0xFF) << 4)
                     | ((lowNibble + (9 < lowNibble ? 39 : 0)) & 0xFF);
  }

  return uint8Array;
}

