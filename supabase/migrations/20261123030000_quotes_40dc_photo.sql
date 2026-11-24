-- Asigna la foto de los 40 pies usados (DC y HC) a las fichas de venta que ya existan en el catálogo.
-- No crea contenedores (falta confirmar precio). Repetible. Foto: public/media/containers/40dc-usado.png
BEGIN;
UPDATE public.quote_container_prices
   SET photo_url = '/media/containers/40dc-usado.png'
 WHERE product_type IN ('40 DC', '40 HC') AND condition = 'Usado' AND (photo_url IS NULL OR photo_url = '');
COMMIT;
