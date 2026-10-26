UPDATE public.listings l SET cover_url = 'https://images.unsplash.com/photo-' || v.id || '?w=1200&q=70&auto=format&fit=crop'
FROM (VALUES
 ('panaderia-el-horno','1509440159596-0249088772ff'),('carniceria-hermanos-ruiz','1607623814075-e51df1bdc82f'),
 ('fruteria-la-huerta','1610832958506-aa56368176cf'),('ultramarinos-dona-carmen','1486297678162-eb2a19b0a32d'),
 ('pescaderia-el-puerto','1534043464124-3be32fe000c9'),('bar-la-plaza','1515443961218-a51367888e4b'),
 ('cafeteria-dulce-rincon','1495474472287-4d71bcdd2085'),('restaurante-el-mirador','1517248135467-4c7edcad34c4'),
 ('venta-los-pinos','1555939594-58d7cb561ad1'),('barberia-el-tijeras','1503951914875-452162b0f3f1'),
 ('estetica-lucia','1604654894610-df63bc536371'),('peluqueria-estilo','1560066984-138dadb4c035'),
 ('carpinteria-la-sierra','1504148455328-c376907d081c'),('electricidad-jm','1621905251189-08b45d6a269e'),
 ('fontaneria-paco','1585704032915-c3400ca199e7'),('jardineria-verde-vivo','1416879595882-3373a0480b5b'),
 ('pinturas-antonio','1562259949-e8e7689d7828'),('bicis-bonela','1485965120184-e220f721d03e'),
 ('taller-motor-sur','1487754180451-c456f719a1fc'),('farmacia-central','1576602976047-174e57a47881'),
 ('fisioterapia-marta-lopez','1544161515-4ab6ce6db874'),('podologia-sergio-mena','1519415510236-718bdfcd89c8'),
 ('psicologia-ana-vega','1497366216548-37526070297c'),('abogada-elena-ruiz','1589829545856-d10d557cf95f'),
 ('asesoria-gomez','1554224155-6726b3ff858f'),('clases-ingles-sarah','1503676260728-1c00da094a0b'),
 ('fotografia-luz-de-sierra','1502920917128-1aa500764cbd'),('ferreteria-el-clavo','1530124566582-a618bc2615dc'),
 ('floristeria-azahar','1487070183336-b863922373d4'),('papeleria-el-lapiz','1456735190827-d1262f71b8a3')
) AS v(slug, id) WHERE l.slug = v.slug;

UPDATE public.listings l SET gallery_urls = (SELECT array_agg('https://images.unsplash.com/photo-' || x || '?w=900&q=70&auto=format&fit=crop') FROM unnest(v.ids) x)
FROM (VALUES
 ('panaderia-el-horno', ARRAY['1549931319-a545dcf3bc73','1555507036-ab1f4038808a','1542838132-92c53300491e']),
 ('bar-la-plaza', ARRAY['1501339847302-ac426a4a7cbb','1414235077428-338989a2e8c0','1495474472287-4d71bcdd2085']),
 ('fontaneria-paco', ARRAY['1621905251189-08b45d6a269e','1504148455328-c376907d081c','1530124566582-a618bc2615dc']),
 ('fisioterapia-marta-lopez', ARRAY['1600948836101-f9ffda59d250','1571019613454-1cb2f99b2d8b','1519415510236-718bdfcd89c8'])
) AS v(slug, ids) WHERE l.slug = v.slug;
UPDATE public.listings SET gallery_urls = '{}' WHERE slug NOT IN ('panaderia-el-horno','bar-la-plaza','fontaneria-paco','fisioterapia-marta-lopez');