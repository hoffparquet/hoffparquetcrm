import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { productRowToApi } from "@/lib/mappers";

export async function GET() {
  const rows = await sql`select * from products order by name asc`;
  return NextResponse.json(rows.map(productRowToApi));
}

// Creates a new product, or updates an existing one if the body includes an
// id that already exists in the catalog.
export async function POST(request) {
  const body = await request.json();

  const variations = JSON.stringify(
    (body.variations || [])
      .filter((v) => (v.label || "").trim() || v.price)
      .map((v) => {
        const entry = { id: v.id, label: v.label || "", price: Number(v.price) || 0 };
        if (v.b2bPrice !== undefined && v.b2bPrice !== null && v.b2bPrice !== "") {
          entry.b2bPrice = Number(v.b2bPrice);
        }
        if (v.costPrice !== undefined && v.costPrice !== null && v.costPrice !== "") {
          entry.costPrice = Number(v.costPrice);
        }
        return entry;
      })
  );

  if (body.id) {
    const existing = await sql`select id from products where id = ${body.id}`;
    if (existing.length > 0) {
      const rows = await sql`
        update products set
          name = ${body.name || "Untitled product"},
          category = ${body.category || ""},
          wood_species = ${body.woodSpecies || ""},
          unit = ${body.unit || "item"},
          description = ${body.description || ""},
          origin = ${body.origin || ""},
          finish = ${body.finish || ""},
          grade_notes = ${body.gradeNotes || ""},
          notes = ${body.notes || ""},
          variations = ${variations}::jsonb,
          updated_at = now()
        where id = ${body.id}
        returning *
      `;
      return NextResponse.json(productRowToApi(rows[0]));
    }
  }

  const rows = await sql`
    insert into products (
      id, name, category, wood_species, unit, price_list_date, description,
      origin, finish, grade_notes, notes, variations
    ) values (
      gen_random_uuid()::text, ${body.name || "Untitled product"}, ${body.category || ""},
      ${body.woodSpecies || ""}, ${body.unit || "item"}, ${new Date().toISOString().slice(0, 10)},
      ${body.description || ""}, ${body.origin || ""}, ${body.finish || ""},
      ${body.gradeNotes || ""}, ${body.notes || ""}, ${variations}::jsonb
    )
    returning *
  `;
  return NextResponse.json(productRowToApi(rows[0]), { status: 201 });
}
