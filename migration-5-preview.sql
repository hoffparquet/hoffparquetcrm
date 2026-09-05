-- Preview only — run this FIRST. It's read-only (a SELECT, not an UPDATE),
-- so it changes nothing. It shows, for every material product, the current
-- retail price range and what it would become after migration-5 runs.
--
-- Once this looks right, run migration-5-materials-price-increase.sql to
-- actually apply it.

select
  prod.name,
  prod.category,
  min((t.elem->>'price')::numeric)      as retail_min_before,
  max((t.elem->>'price')::numeric)      as retail_max_before,
  min(
    case
      when (t.elem->>'price')::numeric < 60
        then round((t.elem->>'price')::numeric * 1.10, 2)
      else round((t.elem->>'price')::numeric * 1.07, 2)
    end
  ) as retail_min_after,
  max(
    case
      when (t.elem->>'price')::numeric < 60
        then round((t.elem->>'price')::numeric * 1.10, 2)
      else round((t.elem->>'price')::numeric * 1.07, 2)
    end
  ) as retail_max_after,
  count(*) as variation_count
from products prod
cross join lateral jsonb_array_elements(prod.variations) as t(elem)
where prod.category <> 'Installation & Labour'
group by prod.id, prod.name, prod.category
order by prod.name;
