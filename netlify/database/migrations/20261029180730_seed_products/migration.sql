-- Seed the catalog that used to live in code so existing product IDs keep working.
INSERT INTO "products" ("id", "name", "description", "price", "unit", "sort_order") VALUES
  ('jar-20l', '20 L Water Jar', 'RO + UV purified, sealed can for home dispensers.', 60, 'per jar', 10),
  ('bottle-1l', '1 L Bottles', 'Case of 12 mineral-enriched bottles.', 240, 'per case', 20),
  ('bottle-500ml', '500 ml Bottles', 'Case of 24, perfect for offices and events.', 220, 'per case', 30),
  ('jar-deposit', 'Jar Deposit', 'One-time refundable deposit for a new 20 L jar.', 150, 'per jar', 40)
ON CONFLICT ("id") DO NOTHING;
