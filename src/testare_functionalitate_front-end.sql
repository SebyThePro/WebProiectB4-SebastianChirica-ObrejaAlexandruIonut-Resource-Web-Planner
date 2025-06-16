SELECT storage_id, user_id, name, title_bar_color, title_bar_text_color, created_at, last_updated
FROM storages
WHERE user_id = (SELECT user_id FROM users WHERE username = 'seby222'); 