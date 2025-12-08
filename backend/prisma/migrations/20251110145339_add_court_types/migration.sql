-- CreateTable
CREATE TABLE "court_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "complexId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "court_types_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "court_types_name_complexId_key" ON "court_types"("name", "complexId");

-- AddForeignKey
ALTER TABLE "court_types" ADD CONSTRAINT "court_types_complexId_fkey" FOREIGN KEY ("complexId") REFERENCES "complexes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Inserir tipos padrão
INSERT INTO "court_types" ("id", "name", "isDefault", "complexId", "createdAt", "updatedAt") 
VALUES 
  (gen_random_uuid(), 'Futebol Society', true, NULL, NOW(), NOW()),
  (gen_random_uuid(), 'Futsal', true, NULL, NOW(), NOW()),
  (gen_random_uuid(), 'Beach Tennis', true, NULL, NOW(), NOW()),
  (gen_random_uuid(), 'Vôlei de Praia', true, NULL, NOW(), NOW()),
  (gen_random_uuid(), 'Vôlei', true, NULL, NOW(), NOW()),
  (gen_random_uuid(), 'Basquete', true, NULL, NOW(), NOW()),
  (gen_random_uuid(), 'Tênis', true, NULL, NOW(), NOW());

-- AlterTable: Adicionar courtTypeId como NULLABLE primeiro
ALTER TABLE "courts" ADD COLUMN "courtTypeId" TEXT;

-- Criar tipos personalizados para sportTypes existentes
INSERT INTO "court_types" ("id", "name", "isDefault", "complexId", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid(),
  c."sportType",
  false,
  c."complexId",
  NOW(),
  NOW()
FROM "courts" c
WHERE NOT EXISTS (
  SELECT 1 FROM "court_types" ct 
  WHERE ct."name" = c."sportType" 
  AND (ct."complexId" = c."complexId" OR ct."isDefault" = true)
)
GROUP BY c."sportType", c."complexId";

-- Atualizar courtTypeId nas courts existentes
UPDATE "courts" c
SET "courtTypeId" = ct."id"
FROM "court_types" ct
WHERE ct."name" = c."sportType" 
  AND (ct."complexId" = c."complexId" OR (ct."isDefault" = true AND ct."complexId" IS NULL));

-- Tornar courtTypeId obrigatório
ALTER TABLE "courts" ALTER COLUMN "courtTypeId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "courts" ADD CONSTRAINT "courts_courtTypeId_fkey" FOREIGN KEY ("courtTypeId") REFERENCES "court_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- DropColumn: Remover sportType
ALTER TABLE "courts" DROP COLUMN "sportType";

-- AlterColumn: Adicionar default na capacity
ALTER TABLE "courts" ALTER COLUMN "capacity" SET DEFAULT 10;