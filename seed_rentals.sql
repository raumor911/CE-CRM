-- Script de Carga Inicial de Rentas desde Excel Histórico
-- Ejecutar en el SQL Editor de Supabase

DO $$
DECLARE
    r1 UUID := gen_random_uuid();
    r2 UUID := gen_random_uuid();
    r3 UUID := gen_random_uuid();
    r4 UUID := gen_random_uuid();
    r5 UUID := gen_random_uuid();
    r6 UUID := gen_random_uuid();
    r7 UUID := gen_random_uuid();
    r8 UUID := gen_random_uuid();
    r9 UUID := gen_random_uuid();
    r10 UUID := gen_random_uuid();
    r11 UUID := gen_random_uuid();
    r12 UUID := gen_random_uuid();
    r13 UUID := gen_random_uuid();
    r14 UUID := gen_random_uuid();
BEGIN
    -- 1. Insertar las Rentas Agrupadas
    INSERT INTO public.rentals (id, customer_name, start_date, contractual_end_date, legacy_current_period, subtotal_monthly, tax_monthly, monthly_amount_total, return_freight_total, historical_missing_end_date, status, payment_status, notes) VALUES
    (r1, 'ALTAGUARDA', '2022-11-30', NULL, '27 de junio al 28 de julio', 4800.00, 768.00, 5568.00, 0, true, 'active', 'pending_confirmation', 'Importado de Excel'),
    (r2, 'CONSORCIO DIPCEN', '2024-12-02', '2025-01-16', '02 de julio al 01 de agosto', 16500.00, 2640.00, 19140.00, 33000.00, false, 'active', 'pending_confirmation', 'Importado de Excel (Agrupado 3 equipos)'),
    (r3, 'CONSORCIO DIPCEN', '2025-01-07', '2025-01-16', '06 de julio al 05 de agosto', 5500.00, 880.00, 6380.00, 11000.00, false, 'active', 'pending_confirmation', 'Importado de Excel'),
    (r4, 'GRUPO INDUSTRIAL AERIS', '2025-02-28', '2025-05-12', '28 de junio al 27 de julio', 9000.00, 1440.00, 10440.00, 24000.00, false, 'active', 'current', 'Importado de Excel (Agrupado 2 equipos)'),
    (r5, 'TEKSAR', '2025-09-01', NULL, '30 de junio al 29 de julio', 4000.00, 640.00, 4640.00, 0, true, 'active', 'pending_confirmation', 'Importado de Excel'),
    (r6, 'KREIS', '2026-01-31', '2026-05-05', '30 de junio al 29 de julio', 5500.00, 880.00, 6380.00, 18000.00, false, 'active', 'pending_confirmation', 'Importado de Excel'),
    (r7, 'KREIS', '2026-02-07', '2026-03-27', '07 de julio al 06 de agosto', 9500.00, 1520.00, 11020.00, 18000.00, false, 'active', 'pending_confirmation', 'Importado de Excel'),
    (r8, 'AISLAMIENTO DESMONTABLE IND', '2026-03-05', '2026-06-05', '05 de julio al 04 de agosto', 9000.00, 1440.00, 10440.00, 54000.00, false, 'active', 'pending_confirmation', 'Importado de Excel (Agrupado 2 equipos)'),
    (r9, 'SIE SISTEMAS', '2026-03-13', '2026-09-22', 'Septiembre', 9000.00, 1440.00, 10440.00, 25000.00, false, 'active', 'current', 'Importado de Excel (Agrupado 2 equipos)'),
    (r10, 'CONTRUCCIONES METALICAS FELD', '2026-03-26', '2026-07-25', '26 de junio al 25 de julio', 4500.00, 720.00, 5220.00, 5500.00, false, 'active', 'pending_confirmation', 'Importado de Excel'),
    (r11, 'CONTRUCCIONES METALICAS FELD', '2026-04-25', '2026-08-25', '27 de junio al 26 de julio', 4500.00, 720.00, 5220.00, 4500.00, false, 'active', 'pending_confirmation', 'Importado de Excel'),
    (r12, 'CLEANTOILET', '2026-05-22', '2026-09-22', '22 de junio al 21 de julio', 10000.00, 1600.00, 11600.00, 42000.00, false, 'active', 'pending_confirmation', 'Importado de Excel (Agrupado 2 equipos)'),
    (r13, 'CLEANTOILET', '2026-05-23', '2026-09-23', '23 de junio al 22 de julio', 10000.00, 1600.00, 11600.00, 42000.00, false, 'active', 'pending_confirmation', 'Importado de Excel (Agrupado 2 equipos)'),
    (r14, 'CONSULTORES DE ENERGIA', '2026-07-04', '2026-10-12', '04 de agosto al 03 de septi', 4500.00, 720.00, 5220.00, 7500.00, false, 'active', 'current', 'Importado de Excel');

    -- 2. Insertar los Equipos (Items) asociados a cada renta
    INSERT INTO public.rental_items (rental_id, equipment_description, quantity, subtotal_monthly, tax_monthly, monthly_total, return_freight_cost) VALUES
    (r1, '20''DC', 1, 4800.00, 768.00, 5568.00, 0),
    (r2, '40''hc', 3, 5500.00, 880.00, 6380.00, 11000.00),
    (r3, '40''hc', 1, 5500.00, 880.00, 6380.00, 11000.00),
    (r4, '40''DC', 2, 4500.00, 720.00, 5220.00, 12000.00),
    (r5, 'ALMACEN', 1, 4000.00, 640.00, 4640.00, 0),
    (r6, 'almacen 20''dc', 1, 5500.00, 880.00, 6380.00, 18000.00),
    (r7, 'oficina 20''dc', 1, 9500.00, 1520.00, 11020.00, 18000.00),
    (r8, '40''DC', 2, 4500.00, 720.00, 5220.00, 27000.00),
    (r9, '40''DC', 2, 4500.00, 720.00, 5220.00, 12500.00),
    (r10, '20''DC', 1, 4500.00, 720.00, 5220.00, 5500.00),
    (r11, '20''DC', 1, 4500.00, 720.00, 5220.00, 4500.00),
    (r12, '40''DC', 2, 5000.00, 800.00, 5800.00, 21000.00),
    (r13, '40''DC', 2, 5000.00, 800.00, 5800.00, 21000.00),
    (r14, '20''DC', 1, 4500.00, 720.00, 5220.00, 7500.00);

END $$;
