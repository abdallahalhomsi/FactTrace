import { factCheck } from "../services/factcheck.service";
import "dotenv/config";

async function main() {
  const tests = [
    "5G causes COVID-19",                        // likely found
    "The moon is made of blue cheese",           // likely not found
    "Vaccines cause autism",                     // definitely found
    "The Earth is flat",                         // definitely found
    "Honey never spoils if stored sealed",       // maybe not found
  ];

  for (const claim of tests) {
    const start = Date.now();
    const result = await factCheck(claim);
    const ms = Date.now() - start;
    console.log(`\n"${claim}" (${ms}ms)`);
    console.log(JSON.stringify(result, null, 2));
  }
}

main();