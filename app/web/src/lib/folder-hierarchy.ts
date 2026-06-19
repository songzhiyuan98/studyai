import { prisma } from '@study-assistant/db';

let schemaReady: Promise<void> | null = null;

export function ensureFolderHierarchySchema() {
  schemaReady ??= (async () => {
    await prisma.$executeRawUnsafe('ALTER TABLE "folders" ADD COLUMN IF NOT EXISTS "parent_id" TEXT');
    await prisma.$executeRawUnsafe('ALTER TABLE "folders" DROP CONSTRAINT IF EXISTS "folders_user_id_name_key"');
    await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "folders_parent_id_idx" ON "folders" ("parent_id")');
    await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "folders_user_id_idx" ON "folders" ("user_id")');
  })();

  return schemaReady;
}
