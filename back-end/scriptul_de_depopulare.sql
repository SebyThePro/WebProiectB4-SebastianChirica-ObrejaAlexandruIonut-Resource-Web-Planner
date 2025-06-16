DELETE FROM items WHERE user_id IN (SELECT user_id FROM users WHERE username LIKE 'testuser%');
DELETE FROM password_reset_tokens WHERE user_id IN (SELECT user_id FROM users WHERE username LIKE 'testuser%');
DELETE FROM categories WHERE user_id IN (SELECT user_id FROM users WHERE username LIKE 'testuser%');
DELETE FROM storages WHERE user_id IN (SELECT user_id FROM users WHERE username LIKE 'testuser%');

DELETE FROM users WHERE username LIKE 'testuser%';

COMMIT; 