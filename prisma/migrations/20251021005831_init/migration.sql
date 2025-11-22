-- CreateEnum
CREATE TYPE "budget_band" AS ENUM ('low', 'mid', 'high');

-- CreateEnum
CREATE TYPE "time_window" AS ENUM ('evening', 'halfday', 'fullday');

-- CreateEnum
CREATE TYPE "mood_category" AS ENUM ('chill', 'adventure', 'foodie', 'cultural', 'social', 'romantic');

-- CreateEnum
CREATE TYPE "swipe_action" AS ENUM ('like', 'skip', 'detail_tap');

-- CreateEnum
CREATE TYPE "swipe_direction" AS ENUM ('left', 'right', 'tap');

-- CreateEnum
CREATE TYPE "device_type" AS ENUM ('mobile', 'tablet', 'desktop');

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_active_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_agent" TEXT NOT NULL,
    "device_type" "device_type" NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "session_id" UUID NOT NULL,
    "budget_band" "budget_band" NOT NULL,
    "time_window" "time_window" NOT NULL,
    "mood_tags" "mood_category"[],
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("session_id")
);

-- CreateTable
CREATE TABLE "destinations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name_th" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "desc_th" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "budget_band" "budget_band" NOT NULL,
    "tags" TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "destinations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "swipe_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_id" UUID NOT NULL,
    "destination_id" UUID NOT NULL,
    "action" "swipe_action" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "direction" "swipe_direction" NOT NULL,
    "velocity" DECIMAL(10,2),
    "duration_ms" INTEGER,
    "view_duration_ms" INTEGER,
    "batch_id" UUID,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "swipe_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "swipe_analytics" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "destination_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "skip_count" INTEGER NOT NULL DEFAULT 0,
    "detail_tap_count" INTEGER NOT NULL DEFAULT 0,
    "avg_view_duration" DECIMAL(10,2),
    "avg_swipe_velocity" DECIMAL(10,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "swipe_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_analytics" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_id" UUID NOT NULL,
    "total_swipes" INTEGER NOT NULL DEFAULT 0,
    "like_rate" DECIMAL(5,4),
    "avg_decision_time" DECIMAL(10,2),
    "session_duration" INTEGER,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "destinations_budget_band_idx" ON "destinations"("budget_band");

-- CreateIndex
CREATE INDEX "destinations_tags_idx" ON "destinations"("tags");

-- CreateIndex
CREATE INDEX "destinations_is_active_updated_at_idx" ON "destinations"("is_active", "updated_at" DESC);

-- CreateIndex
CREATE INDEX "swipe_events_session_id_timestamp_idx" ON "swipe_events"("session_id", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "swipe_events_destination_id_action_idx" ON "swipe_events"("destination_id", "action");

-- CreateIndex
CREATE INDEX "swipe_events_timestamp_idx" ON "swipe_events"("timestamp" DESC);

-- CreateIndex
CREATE INDEX "swipe_events_batch_id_idx" ON "swipe_events"("batch_id");

-- CreateIndex
CREATE INDEX "swipe_events_processed_at_idx" ON "swipe_events"("processed_at");

-- CreateIndex
CREATE INDEX "swipe_analytics_date_idx" ON "swipe_analytics"("date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "swipe_analytics_destination_id_date_key" ON "swipe_analytics"("destination_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "session_analytics_session_id_key" ON "session_analytics"("session_id");

-- CreateIndex
CREATE INDEX "session_analytics_completed_at_idx" ON "session_analytics"("completed_at" DESC);

-- CreateIndex
CREATE INDEX "session_analytics_like_rate_idx" ON "session_analytics"("like_rate");

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "swipe_events" ADD CONSTRAINT "swipe_events_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "swipe_events" ADD CONSTRAINT "swipe_events_destination_id_fkey" FOREIGN KEY ("destination_id") REFERENCES "destinations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "swipe_analytics" ADD CONSTRAINT "swipe_analytics_destination_id_fkey" FOREIGN KEY ("destination_id") REFERENCES "destinations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_analytics" ADD CONSTRAINT "session_analytics_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
