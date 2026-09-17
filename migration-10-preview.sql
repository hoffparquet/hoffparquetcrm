-- Preview only — run this FIRST. It's read-only (a SELECT, not an UPDATE),
-- so it changes nothing. It shows every variation that migration-10 would
-- add a cost price to, its current retail price, and the resulting margin.

select
  prod.name as product,
  t.elem->>'label' as specification,
  (t.elem->>'price')::numeric as current_retail_price
from products prod
cross join lateral jsonb_array_elements(prod.variations) as t(elem)
where prod.id in ('seed-install-labour', 'seed-site-visit-labour')
  and (
    t.elem->>'label' like 'Herringbone parquet%'
    or t.elem->>'label' like 'Chevron parquet%'
    or t.elem->>'label' like 'Engineered wood flooring — standard planks%'
    or t.elem->>'label' like 'Engineered wide-plank flooring%'
    or t.elem->>'label' like 'Douglas Fir flooring — wide/long planks%'
    or t.elem->>'label' like 'Skirting removal and refitting%'
  )
order by prod.name, specification;
