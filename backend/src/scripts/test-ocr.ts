import fs from "fs";
import path from "path";
import { ocr } from "../services/ocr.service";

async function main() {
  const samplesDir = path.join(__dirname, "../../samples");
  if (!fs.existsSync(samplesDir)) {
    console.error(`No samples dir at ${samplesDir}. Add test images.`);
    process.exit(1);
  }

  const files = fs.readdirSync(samplesDir).filter((f) =>
    /\.(jpg|jpeg|png|webp)$/i.test(f)
  );

  for (const file of files) {
    const buf = fs.readFileSync(path.join(samplesDir, file));
    const result = await ocr(buf);
    console.log(`\n=== ${file} ===`);
    console.log(JSON.stringify(result, null, 2));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});