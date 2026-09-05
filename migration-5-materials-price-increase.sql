-- Hoff Parquet CRM — migration 5: materials price increase
-- Applies to Retail price only, per variation:
--   - if the current retail price is below £60 -> +10%
--   - if the current retail price is £60 or above -> +7%
-- B2B price is recalculated to stay exactly 15% below the new retail price.
-- Cost price is left untouched (it's what we pay our supplier — that hasn't
-- changed just because our own sell price has).
--
-- Scope: materials only (category <> 'Installation & Labour'). Labour rate
-- cards are completely unaffected by this migration.
--
-- IMPORTANT — this changes live pricing data. Before running this, if your
-- Neon plan supports it, create a branch (Neon's built-in snapshot feature)
-- so you can instantly roll back if anything looks wrong. This migration
-- cannot be undone by re-running it.

update products p
set
  variations = agg.new_variations,
  updated_at = now()
from (
  select
    prod.id as product_id,
    jsonb_agg(
      (t.elem || jsonb_build_object(
        'price', np.new_price,
        'b2bPrice', round(np.new_price * 0.85, 2)
      ))
      order by t.ord
    ) as new_variations
  from products prod
  cross join lateral jsonb_array_elements(prod.variations) with ordinality as t(elem, ord)
  cross join lateral (
    select
      case
        when (t.elem->>'price')::numeric < 60
          then round((t.elem->>'price')::numeric * 1.10, 2)
        else round((t.elem->>'price')::numeric * 1.07, 2)
      end as new_price
  ) as np
  where prod.category <> 'Installation & Labour'
  group by prod.id
) as agg
where p.id = agg.product_id;
