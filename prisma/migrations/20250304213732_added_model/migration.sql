-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "stravaId" TEXT NOT NULL,
    "name" TEXT,
    "refreshToken" TEXT NOT NULL,
    "accessToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_stravaId_key" ON "User"("stravaId");
