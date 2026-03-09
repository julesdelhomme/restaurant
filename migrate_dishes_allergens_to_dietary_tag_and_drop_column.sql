-- Migre les allergènes legacy (colonne dishes.allergens) vers dietary_tag
-- puis supprime la colonne legacy pour éviter les conflits avec la Bibliothèque des Allergènes.
--
-- Cette version gère les 2 cas:
-- - public.dishes.dietary_tag en jsonb
-- - public.dishes.dietary_tag en text (JSON sérialisé)

create or replace function pg_temp.safe_jsonb(input_text text)
returns jsonb
language plpgsql
as $$
begin
  if input_text is null or btrim(input_text) = '' then
    return '{}'::jsonb;
  end if;
  return input_text::jsonb;
exception
  when others then
    return '{}'::jsonb;
end;
$$;

do $$
declare
  dietary_tag_type text;
begin
  select c.data_type
  into dietary_tag_type
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'dishes'
    and c.column_name = 'dietary_tag';

  if dietary_tag_type is null then
    raise exception 'Colonne public.dishes.dietary_tag introuvable';
  end if;

  if dietary_tag_type = 'jsonb' then
    execute $sql$
      update public.dishes
      set dietary_tag = coalesce(dietary_tag, '{}'::jsonb) || jsonb_build_object(
        'allergens_selected',
        coalesce(
          (
            select jsonb_agg(trim(value))
            from regexp_split_to_table(coalesce(allergens, ''), ',') as value
            where trim(value) <> ''
          ),
          '[]'::jsonb
        ),
        'allergens_fr',
        coalesce(
          (
            select jsonb_agg(trim(value))
            from regexp_split_to_table(coalesce(allergens, ''), ',') as value
            where trim(value) <> ''
          ),
          '[]'::jsonb
        )
      )
      where coalesce(trim(allergens), '') <> '';
    $sql$;
  else
    execute $sql$
      update public.dishes
      set dietary_tag = (
        pg_temp.safe_jsonb(dietary_tag) || jsonb_build_object(
          'allergens_selected',
          coalesce(
            (
              select jsonb_agg(trim(value))
              from regexp_split_to_table(coalesce(allergens, ''), ',') as value
              where trim(value) <> ''
            ),
            '[]'::jsonb
          ),
          'allergens_fr',
          coalesce(
            (
              select jsonb_agg(trim(value))
              from regexp_split_to_table(coalesce(allergens, ''), ',') as value
              where trim(value) <> ''
            ),
            '[]'::jsonb
          )
        )
      )::text
      where coalesce(trim(allergens), '') <> '';
    $sql$;
  end if;
end
$$;

alter table if exists public.dishes
drop column if exists allergens;
