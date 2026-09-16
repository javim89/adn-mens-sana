-- CreateTable
CREATE TABLE "insights_dashboards" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "es_sistema" BOOLEAN NOT NULL DEFAULT false,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "creado_por" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "insights_dashboards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insights_widgets" (
    "id" TEXT NOT NULL,
    "dashboard_id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "tipo" TEXT NOT NULL,
    "query_spec" JSONB NOT NULL,
    "viz_config" JSONB NOT NULL,
    "x" INTEGER NOT NULL DEFAULT 0,
    "y" INTEGER NOT NULL DEFAULT 0,
    "w" INTEGER NOT NULL DEFAULT 6,
    "h" INTEGER NOT NULL DEFAULT 6,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "insights_widgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insights_filters" (
    "id" TEXT NOT NULL,
    "dashboard_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "dataset" TEXT NOT NULL,
    "dimension" TEXT NOT NULL,
    "operator" TEXT NOT NULL,
    "valor_default" JSONB,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "insights_filters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insights_filter_targets" (
    "filter_id" TEXT NOT NULL,
    "widget_id" TEXT NOT NULL,

    CONSTRAINT "insights_filter_targets_pkey" PRIMARY KEY ("filter_id","widget_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "insights_dashboards_slug_key" ON "insights_dashboards"("slug");

-- CreateIndex
CREATE INDEX "insights_widgets_dashboard_id_idx" ON "insights_widgets"("dashboard_id");

-- CreateIndex
CREATE INDEX "insights_filters_dashboard_id_idx" ON "insights_filters"("dashboard_id");

-- CreateIndex
CREATE INDEX "insights_filter_targets_widget_id_idx" ON "insights_filter_targets"("widget_id");

-- AddForeignKey
ALTER TABLE "insights_widgets" ADD CONSTRAINT "insights_widgets_dashboard_id_fkey" FOREIGN KEY ("dashboard_id") REFERENCES "insights_dashboards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insights_filters" ADD CONSTRAINT "insights_filters_dashboard_id_fkey" FOREIGN KEY ("dashboard_id") REFERENCES "insights_dashboards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insights_filter_targets" ADD CONSTRAINT "insights_filter_targets_filter_id_fkey" FOREIGN KEY ("filter_id") REFERENCES "insights_filters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insights_filter_targets" ADD CONSTRAINT "insights_filter_targets_widget_id_fkey" FOREIGN KEY ("widget_id") REFERENCES "insights_widgets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
