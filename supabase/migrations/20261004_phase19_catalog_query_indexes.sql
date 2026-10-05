CREATE INDEX IF NOT EXISTS idx_courses_published_listing
  ON courses (published_at DESC)
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_courses_admin_listing
  ON courses (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_courses_admin_status_category_listing
  ON courses (status, category_id, created_at DESC);
