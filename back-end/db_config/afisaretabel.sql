DESCRIBE users;
DESCRIBE categories;
DESCRIBE storages;
DESCRIBE items;
DESCRIBE password_reset_tokens;
SELECT column_name, data_type, data_length, nullable
FROM user_tab_columns
WHERE table_name = 'ITEMS';