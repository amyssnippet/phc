#!/bin/sh
set -e

echo "Starting MahaSwasthya Backend entrypoint..."

# If command is worker, run worker directly
if [ "$1" = "npm" ] && [ "$2" = "run" ] && [ "$3" = "worker" ]; then
  echo "Starting worker process..."
  exec "$@"
fi

if [ "$1" = "node" ] && [ "$2" = "dist/worker.js" ]; then
  echo "Starting worker process (node dist/worker.js)..."
  exec "$@"
fi

echo "Deploying database migrations..."
npx prisma migrate deploy

echo "Running HFR data import and demo seed..."
node -e '
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
async function check() {
  const count = await prisma.facility.count();
  if (count === 0) {
    console.log("Database empty, running initial import and seed...");
    process.exit(1);
  } else {
    console.log(`Database already initialized with ${count} facilities.`);
    process.exit(0);
  }
}
check().finally(() => prisma.$disconnect());
' || (npx tsx scripts/import-hfr-json.ts && npx tsx scripts/generate-demo-data.ts)

echo "Starting Backend API Server..."
exec node dist/server.js
