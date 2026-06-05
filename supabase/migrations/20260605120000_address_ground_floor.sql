-- Update registered office address: First Floor → Ground Floor (siteSettings + localized CMS copies).
update cms_snapshots
set
  data = replace(
    replace(data::text, 'First Floor, Jyoti Chambers', 'Ground Floor, Jyoti Chambers'),
    'First%20Floor%2C%20Jyoti%20Chambers',
    'Ground%20Floor%2C%20Jyoti%20Chambers'
  )::jsonb,
  updated_at = now()
where data::text like '%First Floor, Jyoti Chambers%';
