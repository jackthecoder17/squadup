-- AlterTable
ALTER TABLE "MatchPlayer" ADD COLUMN     "ready" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "MatchMessage" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerRating" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerRating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MatchMessage_matchId_createdAt_idx" ON "MatchMessage"("matchId", "createdAt");

-- CreateIndex
CREATE INDEX "PlayerRating_toUserId_idx" ON "PlayerRating"("toUserId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerRating_matchId_fromUserId_toUserId_key" ON "PlayerRating"("matchId", "fromUserId", "toUserId");

-- AddForeignKey
ALTER TABLE "MatchMessage" ADD CONSTRAINT "MatchMessage_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchMessage" ADD CONSTRAINT "MatchMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerRating" ADD CONSTRAINT "PlayerRating_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerRating" ADD CONSTRAINT "PlayerRating_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerRating" ADD CONSTRAINT "PlayerRating_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
