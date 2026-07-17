-- AlterTable: link a Google account to a staff user (nullable — password stays the default login)
ALTER TABLE "users" ADD COLUMN "google_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");
