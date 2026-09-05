-- Diagnostic — run this in Neon's SQL Editor to see the CURRENT live prices,
-- bypassing the app entirely. This tells us whether the price increase
-- actually reached the database or not.

select
  name,
  category,
  variations -> 0 ->> 'label' as first_variation,
  variations -> 0 ->> 'price' as first_price,
  updated_at
from products
where category <> 'Installation & Labour'
order by name;
