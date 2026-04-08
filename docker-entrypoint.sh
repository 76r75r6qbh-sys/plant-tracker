#!/bin/sh
set -e

echo "Running migrations..."
node server/db/migrate.js

echo "Seeding database..."
node server/db/seed.js

echo "Starting app..."
exec npm start
