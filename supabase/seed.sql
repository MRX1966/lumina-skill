-- Seed a working default dataset for local development and smoke tests.
-- This script is idempotent and refreshes the seeded test accounts on each run.
-- Test logins below are for local development only. Never run this seed on production.

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
VALUES
  (
    '00000000-0000-0000-0000-000000000000'::uuid,
    '11111111-1111-1111-1111-111111111111'::uuid,
    'authenticated',
    'authenticated',
    'admin@lumina.local',
    extensions.crypt('LuminaAdmin2026!', extensions.gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"System Admin"}'::jsonb,
    NOW(),
    NOW()
  ),
  (
    '00000000-0000-0000-0000-000000000000'::uuid,
    '22222222-2222-2222-2222-222222222222'::uuid,
    'authenticated',
    'authenticated',
    'instructor@lumina.local',
    extensions.crypt('LuminaInstructor2026!', extensions.gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Alex Morgan"}'::jsonb,
    NOW(),
    NOW()
  ),
  (
    '00000000-0000-0000-0000-000000000000'::uuid,
    '33333333-3333-3333-3333-333333333333'::uuid,
    'authenticated',
    'authenticated',
    'student@lumina.local',
    extensions.crypt('LuminaStudent2026!', extensions.gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Taylor Student"}'::jsonb,
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO UPDATE
SET email = EXCLUDED.email,
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = EXCLUDED.email_confirmed_at,
    raw_app_meta_data = EXCLUDED.raw_app_meta_data,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    updated_at = NOW();

INSERT INTO public.profiles (user_id, email, full_name, username, role, status)
VALUES (
  '11111111-1111-1111-1111-111111111111'::uuid,
  'admin@lumina.local',
  'System Admin',
  'admin',
  'admin',
  'active'
)
ON CONFLICT (user_id) DO UPDATE
SET email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    username = EXCLUDED.username,
    role = EXCLUDED.role,
    status = EXCLUDED.status;

INSERT INTO public.course_categories (name, slug, description, sort_order)
VALUES
  ('Web Development', 'web-development', 'Frontend, backend, and full-stack product building.', 1),
  ('Data Science', 'data-science', 'Analytics, ML, and decision-making fundamentals.', 2),
  ('Design', 'design', 'Interface, UX, and product design workflows.', 3)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.profiles (user_id, email, full_name, username, role, status)
VALUES (
  '22222222-2222-2222-2222-222222222222'::uuid,
  'instructor@lumina.local',
  'Alex Morgan',
  'alex',
  'instructor',
  'active'
)
ON CONFLICT (user_id) DO UPDATE
SET email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    username = EXCLUDED.username,
    role = EXCLUDED.role,
    status = EXCLUDED.status;

INSERT INTO public.profiles (user_id, email, full_name, username, role, status)
VALUES (
  '33333333-3333-3333-3333-333333333333'::uuid,
  'student@lumina.local',
  'Taylor Student',
  'student',
  'student',
  'active'
)
ON CONFLICT (user_id) DO UPDATE
SET email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    username = EXCLUDED.username,
    role = EXCLUDED.role,
    status = EXCLUDED.status;

INSERT INTO public.courses (
  title,
  slug,
  subtitle,
  description,
  category_id,
  level,
  price,
  original_price,
  status,
  duration_hours,
  featured,
  published_at,
  tags,
  skills,
  learning_objectives,
  requirements
)
SELECT
  'React Mastery',
  'react-mastery',
  'Build production-ready React apps with confidence.',
  'A practical course for frontend engineers who want strong product thinking, reusable patterns, and shipping discipline.',
  cc.id,
  'intermediate',
  89.99,
  129.99,
  'published',
  6,
  true,
  NOW(),
  ARRAY['react', 'frontend', 'ui'],
  ARRAY['Component architecture', 'State management', 'Testing'],
  ARRAY['Create reusable component systems', 'Handle real-world data flows', 'Ship polished interfaces'],
  ARRAY['Basic JavaScript knowledge', 'Comfort with a browser dev environment']
FROM public.course_categories cc
WHERE cc.slug = 'web-development'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.course_instructors (course_id, profile_id, role, sort_order)
SELECT c.id, p.id, 'primary', 1
FROM public.courses c
JOIN public.profiles p ON p.email = 'instructor@lumina.local'
WHERE c.slug = 'react-mastery'
ON CONFLICT (course_id, profile_id) DO NOTHING;
