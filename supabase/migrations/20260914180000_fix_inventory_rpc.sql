CREATE OR REPLACE FUNCTION public.register_inventory_product(
    p_product_type TEXT,
    p_physical_number TEXT,
    p_condition TEXT,
    p_location TEXT,
    p_location_detail TEXT,
    p_operational_status TEXT,
    p_available_for_sale BOOLEAN,
    p_available_for_rent BOOLEAN,
    p_available_for_modification BOOLEAN,
    p_notes TEXT,
    p_rental_id UUID DEFAULT NULL
) RETURNS public.inventory_products AS $$
DECLARE
    v_product public.inventory_products;
    v_rental_status TEXT;
    v_user_id UUID;
    v_sql TEXT;
BEGIN
    -- Obtener ID del usuario actual
    v_user_id := auth.uid();

    -- Validaciones de estado vs rental_id
    IF p_operational_status = 'Rentada' THEN
        IF p_rental_id IS NULL THEN
            RAISE EXCEPTION 'Selecciona el cliente y la renta a la que está asignado el producto';
        END IF;

        -- Validar que la renta existe y está activa
        SELECT status INTO v_rental_status FROM public.rentals WHERE id = p_rental_id;
        IF v_rental_status IS NULL THEN
            RAISE EXCEPTION 'La renta seleccionada ya no existe';
        END IF;
        IF v_rental_status <> 'active' THEN
            RAISE EXCEPTION 'La renta seleccionada ya no está activa. Actualiza la lista y selecciona otra renta';
        END IF;
    ELSE
        IF p_rental_id IS NOT NULL THEN
            RAISE EXCEPTION 'Un producto no rentado no puede tener una renta asignada';
        END IF;
    END IF;

    -- Construir y ejecutar el INSERT dinámicamente.
    -- Esto fuerza a PostgreSQL a tratar los valores como literales (cadenas de texto),
    -- lo que permite que el motor los convierta implícitamente a cualquier tipo ENUM
    -- (como inventory_product_type) sin requerir conversiones explícitas (CAST).
    v_sql := format(
        'INSERT INTO public.inventory_products (
            product_type,
            physical_number,
            condition,
            location,
            location_detail,
            operational_status,
            available_for_sale,
            available_for_rent,
            available_for_modification,
            notes,
            created_by
        ) VALUES (
            %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L
        ) RETURNING *',
        p_product_type,
        p_physical_number,
        p_condition,
        p_location,
        p_location_detail,
        p_operational_status,
        p_available_for_sale,
        p_available_for_rent,
        p_available_for_modification,
        p_notes,
        v_user_id
    );

    EXECUTE v_sql INTO v_product;

    -- Si es rentada, crear la asignación y registrar actividad adicional
    IF p_rental_id IS NOT NULL THEN
        -- Crear asignación
        INSERT INTO public.rental_inventory_assignments (
            rental_id,
            inventory_product_id,
            created_by
        ) VALUES (
            p_rental_id,
            v_product.id,
            v_user_id
        );

        -- Registrar actividad de asignación
        INSERT INTO public.inventory_activities (
            product_id,
            activity_type,
            description,
            created_by
        ) VALUES (
            v_product.id,
            'rental_assigned',
            'Producto asignado a una renta activa.',
            v_user_id
        );
    END IF;

    RETURN v_product;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
