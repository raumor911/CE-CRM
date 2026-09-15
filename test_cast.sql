CREATE TABLE IF NOT EXISTS test_enum_table (
    id SERIAL PRIMARY KEY,
    status TEXT
);
-- We can't easily test this without a db.
