"""Rebuild the missing Prisma model from the committed migration, without a database connection.

Existing SQL columns, enums, indexes and FK actions are preserved. Client-side
CUID and updatedAt behavior is explicitly documented in the recovery specification.
"""
from pathlib import Path
import re
ROOT=Path(__file__).resolve().parents[1]
SQL=(ROOT/'platform/database/prisma/migrations/20260405000000_init/migration.sql').read_text()
names={'organizations':'Organization','users':'User','org_members':'OrgMember','api_keys':'ApiKey','projects':'Project','workflows':'Workflow','tasks':'Task','agent_configs':'AgentConfig','agent_runs':'AgentRun','documents':'Document','artifacts':'Artifact','research':'Research','recommendations':'Recommendation','campaigns':'Campaign','ad_sets':'AdSet','funnels':'Funnel','crm_contacts':'CRMContact','crm_interactions':'CRMInteraction','creative_briefs':'CreativeBrief','ui_pages':'UIPage','approvals':'Approval','cost_records':'CostRecord','activity_logs':'ActivityLog','notifications':'Notification','assets':'Asset','prompt_templates':'PromptTemplate','evaluations':'Evaluation'}
models={};types={};out=['// Restored from the committed migration. See docs/operations/orchestration-recovery.md.','generator client {','  provider = "prisma-client-js"','}','datasource db {','  provider = "postgresql"','  url = env("DATABASE_URL")','}']
for enum,values in re.findall(r'CREATE TYPE "(\w+)" AS ENUM \((.*?)\);',SQL):
 out += [f'enum {enum} {{']+['  '+v.strip(" '") for v in values.split(',')]+['}']
for table,body in re.findall(r'CREATE TABLE "(\w+)" \((.*?)\n\);',SQL,re.S):
 fields=[];cols={}
 for name,typ,tail in re.findall(r'^    "(\w+)" ("\w+"|DOUBLE PRECISION|TIMESTAMP\(3\)|\w+)(.*?)[,\n]',body,re.M):
  base={'TEXT':'String','INTEGER':'Int','DOUBLE PRECISION':'Float','JSONB':'Json','BOOLEAN':'Boolean','TIMESTAMP(3)':'DateTime'}.get(typ,typ.strip('"'))
  array=tail.startswith('[]');nullable='NOT NULL' not in tail and not array
  native=' @db.Timestamp(3)' if typ=='TIMESTAMP(3)' else ''
  annotations=' @id @default(cuid())' if name=='id' else ''
  default=re.search(r'DEFAULT (.*)',tail)
  if default:
   value=default[1].strip()
   if value=='CURRENT_TIMESTAMP':value='now()'
   elif value.startswith("'"):value=('"'+value.strip("'")+'"') if base=='String' else value.strip("'")
   annotations+=f' @default({value})'
  if name=='updatedAt':annotations+=' @updatedAt'
  fields.append(f'  {name} {base}{"[]" if array else "?" if nullable else ""}{native}{annotations}')
  cols[name]=nullable
 models[table]=fields;types[table]=cols
for table,fields,target,refs,delete,update in re.findall(r'ALTER TABLE "(\w+)" ADD CONSTRAINT "[^"]+" FOREIGN KEY \((.*?)\) REFERENCES "(\w+)"\((.*?)\) ON DELETE (\w+(?: \w+)?) ON UPDATE (\w+);',SQL):
 field=fields.strip('"');ref=refs.strip('"');relation=f'{table}_{field}'
 actions={'RESTRICT':'Restrict','CASCADE':'Cascade','SET NULL':'SetNull'}
 models[table].append(f'  {field.removesuffix("Id")}Relation {names[target]}{"?" if types[table][field] else ""} @relation("{relation}", fields: [{field}], references: [{ref}], onDelete: {actions[delete]}, onUpdate: {actions[update]})')
 models[target].append(f'  {table}_{field} {names[table]}[] @relation("{relation}")')
for unique,index,table,columns in re.findall(r'CREATE (UNIQUE )?INDEX "([^"]+)" ON "(\w+)"\((.*?)\);',SQL):
 models[table].append(f'  @@{"unique" if unique else "index"}([{columns.replace(chr(34),"")}], map: "{index}")')
for table,fields in models.items():out += [f'model {names[table]} {{']+fields+[f'  @@map("{table}")','}']
(ROOT/'platform/database/prisma/schema.prisma').write_text('\n\n'.join(out)+'\n')
print(f'Restored {len(models)} migration-backed models; no database accessed.')
