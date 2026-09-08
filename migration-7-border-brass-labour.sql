-- Hoff Parquet CRM — migration 7: chevron/herringbone border & brass inlay labour rates
-- Adds new items to the existing 'Site Visits, Trims & Finishing' product,
-- without touching anything already in its catalog entry.
-- Safe to re-run only ONCE — running it twice will duplicate these rows,
-- since it appends rather than replaces.

update products
set
  variations = variations || '[{"id": "4b82aebc-0beb-4445-be81-1e44f24553cc", "label": "Single plank/block border (Chevron/Herringbone) \u2014 Edinburgh \u2014 per linear metre", "price": 25}, {"id": "cfdd88c4-f155-4f95-93e9-fcb812e2c4da", "label": "Single plank/block border (Chevron/Herringbone) \u2014 Glasgow \u2014 per linear metre", "price": 25}, {"id": "3a650217-9fb8-4eaa-ae2c-ea694794a87d", "label": "Single plank/block border (Chevron/Herringbone) \u2014 Manchester \u2014 per linear metre", "price": 28}, {"id": "956d2743-9d75-4215-8105-cd980f1436f1", "label": "Single plank/block border (Chevron/Herringbone) \u2014 London \u2014 per linear metre", "price": 35}, {"id": "0443e3a1-9837-4d8c-8665-56d1ff13a446", "label": "Brass inlay installation \u2014 Edinburgh \u2014 per linear metre (+ cost of brass)", "price": 35}, {"id": "363afabf-9565-44c3-b385-b01da1613918", "label": "Brass inlay installation \u2014 Glasgow \u2014 per linear metre (+ cost of brass)", "price": 35}, {"id": "52fa2380-7abe-4dab-8509-b52568734a9e", "label": "Brass inlay installation \u2014 Manchester \u2014 per linear metre (+ cost of brass)", "price": 40}, {"id": "9be6ca0f-32b2-40fc-bf08-2a9c99fe0183", "label": "Brass inlay installation \u2014 London \u2014 per linear metre (+ cost of brass)", "price": 50}]'::jsonb,
  updated_at = now()
where id = 'seed-site-visit-labour';
