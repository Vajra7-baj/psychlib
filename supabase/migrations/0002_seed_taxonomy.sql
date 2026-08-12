-- Seed the taxonomy that powers faceted search.
-- Three dimensions mirror how the Fresno State Ed.S. program is actually
-- organized, so students can filter the way they already think:
--   * course       — the specific classes in the 3-year sequence
--   * nasp_domain  — the 10 NASP Practice Model domains (national standard)
--   * population   — student populations the program + Carrasco Lab focus on
-- Idempotent: safe to re-run.

insert into public.tags (name, slug, category) values
  -- Courses (Fresno State School Psychology Ed.S.)
  ('PSYCH 204 · Developmental Psychopathology',        'psych-204', 'course'),
  ('PSYCH 274S · Multicultural Psychology',            'psych-274s', 'course'),
  ('PSYCH 278 · Intervention & Prevention',            'psych-278', 'course'),
  ('PSYCH 284 · Assessment of Intellectual Abilities', 'psych-284', 'course'),
  ('PSYCH 285 · Assessment of Learning & Dev. Problems','psych-285', 'course'),
  ('Practicum & Fieldwork',                            'practicum', 'course'),
  ('Internship',                                       'internship', 'course'),

  -- NASP Practice Model — 10 domains
  ('Data-Based Decision Making',                       'nasp-data-based-decision-making', 'nasp_domain'),
  ('Consultation & Collaboration',                     'nasp-consultation-collaboration', 'nasp_domain'),
  ('Academic Interventions & Instructional Supports',  'nasp-academic-interventions', 'nasp_domain'),
  ('Mental & Behavioral Health Services',              'nasp-mental-behavioral-health', 'nasp_domain'),
  ('School-Wide Practices to Promote Learning',        'nasp-schoolwide-practices', 'nasp_domain'),
  ('Services for Safe & Supportive Schools',           'nasp-safe-supportive-schools', 'nasp_domain'),
  ('Family, School & Community Collaboration',         'nasp-family-community', 'nasp_domain'),
  ('Equitable Practices for Diverse Populations',      'nasp-equitable-practices', 'nasp_domain'),
  ('Research & Evidence-Based Practice',               'nasp-research-evidence', 'nasp_domain'),
  ('Legal, Ethical & Professional Practice',           'nasp-legal-ethical', 'nasp_domain'),

  -- Populations / focus areas
  ('ADHD',                                             'pop-adhd', 'population'),
  ('Autism Spectrum (ASD)',                            'pop-autism', 'population'),
  ('Specific Learning Disabilities',                   'pop-learning-disabilities', 'population'),
  ('English Language Learners',                        'pop-ell', 'population'),
  ('Anxiety & Depression',                             'pop-anxiety-depression', 'population'),
  ('Emotional & Behavioral Disorders',                 'pop-ebd', 'population'),
  ('Intellectual Disability',                          'pop-intellectual-disability', 'population'),
  ('Gifted & Talented',                                'pop-gifted', 'population'),
  ('Early Childhood',                                  'pop-early-childhood', 'population'),
  ('Trauma & Adverse Experiences',                     'pop-trauma', 'population')
on conflict (slug) do update set name = excluded.name, category = excluded.category;
