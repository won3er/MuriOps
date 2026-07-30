-- WordPress, Shopify e FTP foram removidos do produto. O enum PostgreSQL
-- preserva valores históricos, mas as conexões e credenciais associadas não
-- devem permanecer armazenadas nem acessíveis após esta migration.
DELETE FROM "AdapterConnection"
WHERE "kind" IN ('WORDPRESS', 'SHOPIFY', 'FTP');
