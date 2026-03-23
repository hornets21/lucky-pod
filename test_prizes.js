const TOTAL_CELLS = 100;
const PRIZE_COUNT = 10;

function testGenerateBoard(pList) {
  const indices = Array.from({ length: TOTAL_CELLS }, (_, i) => i);
  const shuffledPrizes = [...pList].sort(() => Math.random() - 0.5);
  const statePrizes = {};

  for (let i = 0; i < PRIZE_COUNT; i++) {
    const randomIndex = Math.floor(Math.random() * indices.length);
    const cellIndex = indices.splice(randomIndex, 1)[0];
    statePrizes[cellIndex] = shuffledPrizes[i % shuffledPrizes.length] || "fallback";
  }
  
  return statePrizes;
}

console.log("Test 1: 10 unique prizes");
const prizeList1 = ["P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8", "P9", "P10"];
const res1 = Object.values(testGenerateBoard(prizeList1));
console.log("Result:", res1);
console.log("Unique count:", new Set(res1).size);

console.log("\nTest 2: 3 unique prizes");
const prizeList2 = ["A", "B", "C"];
const res2 = Object.values(testGenerateBoard(prizeList2));
console.log("Result:", res2);
console.log("Unique count:", new Set(res2).size);

console.log("\nTest 3: 1 unique prize");
const prizeList3 = ["OnlyOne"];
const res3 = Object.values(testGenerateBoard(prizeList3));
console.log("Result:", res3);
console.log("Unique count:", new Set(res3).size);
