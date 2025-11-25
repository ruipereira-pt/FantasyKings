#!/bin/bash

# Script to run cleanup-tournaments-by-criteria.sql against local Supabase

set -e

echo "Checking if Supabase is running locally..."
if ! supabase status > /dev/null 2>&1; then
    echo "Supabase is not running. Starting Supabase..."
    supabase start
    echo "Waiting for Supabase to be ready..."
    sleep 5
fi

echo "Getting database connection details..."
DB_URL=$(supabase status --output env | grep DB_URL | cut -d '=' -f2-)

if [ -z "$DB_URL" ]; then
    echo "Could not get database URL. Trying default connection..."
    DB_URL="postgresql://postgres:postgres@localhost:54322/postgres"
fi

echo "Running cleanup-tournaments-by-criteria.sql..."
psql "$DB_URL" -f cleanup-tournaments-by-criteria.sql

echo "✅ SQL script executed successfully!"


