#!/bin/bash

set -e

echo "Setting up Samar-Minime Systems..."

# Check Node version
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed"
    exit 1
fi

node_version=$(node -v)
echo "Using Node $node_version"

# Install dependencies
echo "Installing dependencies..."
npm install

# Generate Prisma client
echo "Generating Prisma client..."
npm run db:generate

# Run migrations
echo "Running database migrations..."
npm run db:migrate

# Seed database
echo "Seeding database..."
npm run db:seed

echo "Setup complete!"
echo ""
echo "Next steps:"
echo "  npm run dev       - Start development servers"
echo "  npm run build     - Build for production"
echo "  npm run docker:up - Start with Docker"
