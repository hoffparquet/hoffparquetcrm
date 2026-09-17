-- Hoff Parquet CRM — migration 11: fitter costs for border & brass inlay work
-- Run this in the Neon SQL Editor. Safe to re-run — targets exact variation IDs.
-- Flat cost across all cities, since no city breakdown was given for these two rates:
--   Single-plank/block border (Chevron/Herringbone): £12/lm
--   Brass inlay installation: £15/lm

update products
set
  variations = (
    select jsonb_agg(
      case t.elem->>'id'
        when '4b82aebc-0beb-4445-be81-1e44f24553cc' then t.elem || jsonb_build_object('costPrice', 12)
        when 'cfdd88c4-f155-4f95-93e9-fcb812e2c4da' then t.elem || jsonb_build_object('costPrice', 12)
        when '3a650217-9fb8-4eaa-ae2c-ea694794a87d' then t.elem || jsonb_build_object('costPrice', 12)
        when '956d2743-9d75-4215-8105-cd980f1436f1' then t.elem || jsonb_build_object('costPrice', 12)
        when '0443e3a1-9837-4d8c-8665-56d1ff13a446' then t.elem || jsonb_build_object('costPrice', 15)
        when '363afabf-9565-44c3-b385-b01da1613918' then t.elem || jsonb_build_object('costPrice', 15)
        when '52fa2380-7abe-4dab-8509-b52568734a9e' then t.elem || jsonb_build_object('costPrice', 15)
        when '9be6ca0f-32b2-40fc-bf08-2a9c99fe0183' then t.elem || jsonb_build_object('costPrice', 15)
        else t.elem
      end
      order by t.ord
    )
    from jsonb_array_elements(products.variations) with ordinality as t(elem, ord)
  ),
  updated_at = now()
where id = 'seed-site-visit-labour';
