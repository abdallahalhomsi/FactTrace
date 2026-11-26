//prints the block-randomised allocation list for config/allocation.ts
//every block of 4 participants gets the 4 groups in a random order, so groups stay balanced after every 4th participant
//run: npx tsx src/scripts/make-allocation.ts [seed] [blocks]   (the committed list used seed 4492026 and 15 blocks)

//small seeded random number generator (mulberry32), so the same seed always gives the same list
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const seed = Number(process.argv[2] ?? 4492026);
const blocks = Number(process.argv[3] ?? 15);
const random = mulberry32(seed);
const list: number[] = [];

for (let b = 0; b < blocks; b++) {
  const block = [1, 2, 3, 4];
  //fisher-yates shuffle
  for (let i = block.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [block[i], block[j]] = [block[j], block[i]];
  }
  list.push(...block);
}

console.log(`//seed ${seed}, ${blocks} blocks of 4 (P01 to P${String(blocks * 4).padStart(2, "0")})`);
for (let b = 0; b < blocks; b++) {
  const from = b * 4 + 1;
  console.log(`  ${list.slice(b * 4, b * 4 + 4).join(", ")}, //P${String(from).padStart(2, "0")} to P${String(from + 3).padStart(2, "0")}`);
}
