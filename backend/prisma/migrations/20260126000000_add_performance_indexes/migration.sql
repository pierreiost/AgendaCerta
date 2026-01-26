-- Performance indexes for common queries
-- These indexes complement the existing indexes in the schema

-- Index for full-text search on client names
CREATE INDEX IF NOT EXISTS idx_clients_fullname ON clients USING gin (to_tsvector('portuguese', "fullName"));

-- Composite index for tab queries (date range + status)
CREATE INDEX IF NOT EXISTS idx_tabs_created_status ON tabs ("createdAt" DESC, status);

-- Composite index for reservation calendar views (complex + date range)
CREATE INDEX IF NOT EXISTS idx_reservations_resource_dates ON reservations ("resourceId", "startTime" DESC, "endTime");

-- Index for product name searches within a complex
CREATE INDEX IF NOT EXISTS idx_products_complex_name ON products ("complexId", name);

-- Index for stock movements date range queries
CREATE INDEX IF NOT EXISTS idx_stock_movements_date_range ON stock_movements ("productId", "createdAt" DESC);

-- Index for user searches by name
CREATE INDEX IF NOT EXISTS idx_users_names ON users ("firstName", "lastName");

-- Partial index for active reservations (excludes cancelled)
CREATE INDEX IF NOT EXISTS idx_reservations_active ON reservations ("resourceId", "startTime", "endTime")
WHERE status != 'CANCELLED';

-- Comment on indexes
COMMENT ON INDEX idx_clients_fullname IS 'Full-text search index for client names in Portuguese';
COMMENT ON INDEX idx_tabs_created_status IS 'Optimizes tab listing by date and status';
COMMENT ON INDEX idx_reservations_resource_dates IS 'Optimizes calendar and conflict queries';
COMMENT ON INDEX idx_reservations_active IS 'Partial index for non-cancelled reservations only';
