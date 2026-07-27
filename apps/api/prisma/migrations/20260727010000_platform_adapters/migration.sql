-- Novos kinds de AdapterConnection: WordPress, Shopify e Nuvemshop (apply real
-- via API oficial) e FTP (Hostinger/Hostgator e qualquer host com acesso a
-- arquivo). Postgres exige ALTER TYPE ... ADD VALUE fora de bloco transacional
-- combinado com outro DDL, então cada valor é adicionado isoladamente.
ALTER TYPE "AdapterKind" ADD VALUE IF NOT EXISTS 'WORDPRESS';
ALTER TYPE "AdapterKind" ADD VALUE IF NOT EXISTS 'SHOPIFY';
ALTER TYPE "AdapterKind" ADD VALUE IF NOT EXISTS 'NUVEMSHOP';
ALTER TYPE "AdapterKind" ADD VALUE IF NOT EXISTS 'FTP';
