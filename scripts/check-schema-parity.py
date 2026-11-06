#!/usr/bin/env python3
"""Compare Prisma-generated SQL with the committed initial migration, without a DB."""
import pathlib
import re
import subprocess
root = pathlib.Path(__file__).resolve().parents[1]
result = subprocess.run([
    'pnpm', '--filter', '@samar/database', 'exec', 'prisma', 'migrate', 'diff',
    '--from-empty', '--to-schema-datamodel', 'prisma/schema.prisma', '--script',
], cwd=root, check=True, capture_output=True, text=True)
original = (root / 'platform/database/prisma/migrations/20260405000000_init/migration.sql').read_text()
def statements(sql):
    sql = re.sub(r'--[^\n]*', '', sql)
    return {re.sub(r'\s+', ' ', part).strip() for part in sql.split(';') if part.strip()}
before, after = statements(original), statements(result.stdout)
if before != after:
    raise SystemExit(f'Schema mismatch: {len(before-after)} missing, {len(after-before)} added statements')
print(f'Schema parity passed: {len(before)} SQL statements; no database connected')
