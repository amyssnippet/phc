import { importHfrJson } from '../scripts/import-hfr-json.js';
import { generateDemoData } from '../scripts/generate-demo-data.js';

async function main() {
  console.log('Running Prisma Database Seed...');
  await importHfrJson();
  await generateDemoData();
  console.log('Prisma Database Seed Complete!');
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
