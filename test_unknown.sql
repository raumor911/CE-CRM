DO $$ 
DECLARE 
  v_text text := 'Oficina';
BEGIN 
  -- Test if we can cast text variable to unknown
  -- RAISE NOTICE '%', v_text::unknown; 
END $$;
