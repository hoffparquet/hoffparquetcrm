-- Hoff Parquet CRM — migration 10: fitting costs + margins for installation labour
-- Run this in the Neon SQL Editor. Safe to re-run — every UPDATE below
-- targets exact variation IDs, so re-running just re-applies the same values.

-- Part 1: add cost prices to existing Herringbone/Chevron, plank installation,
-- and skirting removal variations (36 variations across two products).

update products
set
  variations = (
    select jsonb_agg(
      case t.elem->>'id'
        when 'af4ae252-2e06-4a9d-8155-e80652f7cf75' then t.elem || jsonb_build_object('costPrice', 25)
        when '8c520cc7-dc88-4743-a2b2-67d3073a57da' then t.elem || jsonb_build_object('costPrice', 25)
        when '327be03d-8c4a-4dad-921b-f7667ba1e3d0' then t.elem || jsonb_build_object('costPrice', 30)
        when 'c8236557-84fb-49cf-9778-12ba74332399' then t.elem || jsonb_build_object('costPrice', 30)
        when 'c6cc68ef-7215-441a-ab19-c1486f507bbe' then t.elem || jsonb_build_object('costPrice', 30)
        when 'e47e6ada-f40b-4b2e-9ebd-7b597ea78bb0' then t.elem || jsonb_build_object('costPrice', 30)
        when 'aa04ce40-05c9-489a-8de6-0559491c0d96' then t.elem || jsonb_build_object('costPrice', 25)
        when 'df9b6fcc-2d61-4cae-a411-8b8a497253a4' then t.elem || jsonb_build_object('costPrice', 25)
        when 'bcba25c4-8afe-4326-8ddb-3ef73d3c6cb1' then t.elem || jsonb_build_object('costPrice', 30)
        when '1312a725-a946-4007-8521-5347dd7690b4' then t.elem || jsonb_build_object('costPrice', 30)
        when 'e88e023b-6ae7-4f90-a107-5651c7c82a1a' then t.elem || jsonb_build_object('costPrice', 30)
        when '3b9d357f-000c-4202-997f-47c3b7998dd4' then t.elem || jsonb_build_object('costPrice', 30)
        when 'c7b952d6-2db2-4396-a515-755c188adb16' then t.elem || jsonb_build_object('costPrice', 25)
        when '010ade44-da5a-4082-8503-4bf3b8458991' then t.elem || jsonb_build_object('costPrice', 25)
        when '367629bf-5c14-4ad2-aa6f-09786335e1ea' then t.elem || jsonb_build_object('costPrice', 30)
        when '00476345-cc23-49bb-a2a9-ae2c0a83ed31' then t.elem || jsonb_build_object('costPrice', 30)
        when 'f393c47f-824c-445a-9f5e-b6bc47a5144e' then t.elem || jsonb_build_object('costPrice', 30)
        when '583c3952-ba86-452f-b8e9-ee57a4c4f7b8' then t.elem || jsonb_build_object('costPrice', 30)
        when '3568a557-f49f-4649-b79a-93e98d54debc' then t.elem || jsonb_build_object('costPrice', 35)
        when '394566ad-39dd-4eb8-b6ed-4c90d86fb9da' then t.elem || jsonb_build_object('costPrice', 35)
        when 'b23e4586-eaad-4432-b7ff-dbe318f88799' then t.elem || jsonb_build_object('costPrice', 40)
        when '2b6170d6-9c2c-4efc-b08a-613e1341e481' then t.elem || jsonb_build_object('costPrice', 40)
        when '9a7c9ab6-a27b-4e7d-8ef0-a0f22abdfca7' then t.elem || jsonb_build_object('costPrice', 40)
        when 'ef907f75-ee18-453b-bd05-562cee48438d' then t.elem || jsonb_build_object('costPrice', 40)
        when '6b2aecc1-fc91-484d-8ca4-cf884472bad3' then t.elem || jsonb_build_object('costPrice', 35)
        when '4f9be4a1-1b37-4f1a-a6c9-090894a73a5a' then t.elem || jsonb_build_object('costPrice', 35)
        when '688966b6-29e0-4eb2-86e0-76aec45eb94f' then t.elem || jsonb_build_object('costPrice', 40)
        when '0c1cb03c-dc06-48b1-be6a-2d93846f55f5' then t.elem || jsonb_build_object('costPrice', 40)
        when '60473de8-79b9-4c67-93cc-2652f8c3cc98' then t.elem || jsonb_build_object('costPrice', 40)
        when '0c86ed93-602a-45d1-894d-feba6ff10ec9' then t.elem || jsonb_build_object('costPrice', 40)
        else t.elem
      end
      order by t.ord
    )
    from jsonb_array_elements(products.variations) with ordinality as t(elem, ord)
  ),
  updated_at = now()
where id = 'seed-install-labour';

update products
set
  variations = (
    select jsonb_agg(
      case t.elem->>'id'
        when '9d1296f2-d2d1-4e45-b0b8-f9510c3ea5d7' then t.elem || jsonb_build_object('costPrice', 12)
        when '5da085cc-e5da-484b-889a-2c70dddd6922' then t.elem || jsonb_build_object('costPrice', 12)
        when '9204d56b-d531-4d59-9445-a5608dcfa09d' then t.elem || jsonb_build_object('costPrice', 15)
        when 'c0537d74-19b7-4f8a-a471-bf9420860fd0' then t.elem || jsonb_build_object('costPrice', 15)
        when '46f1b43f-bcfd-49d6-a031-2c788c2dbf0f' then t.elem || jsonb_build_object('costPrice', 15)
        when '852c2dcc-87bb-409f-9ada-95b5b2786281' then t.elem || jsonb_build_object('costPrice', 15)
        else t.elem
      end
      order by t.ord
    )
    from jsonb_array_elements(products.variations) with ordinality as t(elem, ord)
  ),
  updated_at = now()
where id = 'seed-site-visit-labour';

-- Part 2: add Beading as a new line item (didn't exist before), with both
-- cost and retail price so it shows correctly in the Margins view too.

update products
set
  variations = variations || '[{"id": "e54a96cd-72ce-4cc0-a066-b0fac43e3a18", "label": "Beading \u2014 per linear metre \u2014 Edinburgh \u2014 Low", "price": 12, "costPrice": 8}, {"id": "7929a27b-665e-4f38-bca5-855ee5e46cc7", "label": "Beading \u2014 per linear metre \u2014 Edinburgh \u2014 High", "price": 22, "costPrice": 8}, {"id": "ec1a17fd-fd6b-48c7-bfeb-e3c6d4b21006", "label": "Beading \u2014 per linear metre \u2014 Manchester \u2014 Low", "price": 15, "costPrice": 10}, {"id": "4c42657c-a653-4292-968a-1fc4b507e122", "label": "Beading \u2014 per linear metre \u2014 Manchester \u2014 High", "price": 30, "costPrice": 10}, {"id": "538fe755-7a9b-4cea-aa8e-85c0c4b57b8e", "label": "Beading \u2014 per linear metre \u2014 London \u2014 Low", "price": 15, "costPrice": 10}, {"id": "6d950f45-2b7f-4e6e-b724-77318ce9ba50", "label": "Beading \u2014 per linear metre \u2014 London \u2014 High", "price": 30, "costPrice": 10}]'::jsonb,
  updated_at = now()
where id = 'seed-site-visit-labour';
