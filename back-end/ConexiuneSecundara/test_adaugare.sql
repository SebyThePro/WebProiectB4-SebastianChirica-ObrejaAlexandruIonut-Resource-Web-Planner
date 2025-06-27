SELECT 
    user_id, 
    username, 
    email, 
    role, 
    registration_date, 
    last_updated 
FROM 
    users
ORDER BY 
    user_id ASC;
SELECT 
    i.item_id, 
    i.name AS item_name, 
    i.quantity, 
    i.unit_of_measure,
    i.description AS item_description,
    s.name AS storage_name,
    c.name AS category_name,
    u.username AS owner_username,
    i.expiry_date,
    i.check_date,
    i.low_stock_threshold,
    i.created_at AS item_created_at,
    i.last_updated AS item_last_updated
FROM 
    items i
JOIN 
    users u ON i.user_id = u.user_id
JOIN 
    storages s ON i.storage_id = s.storage_id
LEFT JOIN 
    categories c ON i.category_id = c.category_id
ORDER BY 
    u.username ASC, s.name ASC, i.name ASC;
SELECT 
    s.storage_id, 
    s.name AS storage_name, 
    s.title_bar_color, 
    s.title_bar_text_color,
    u.username AS owner_username,
    s.created_at AS storage_created_at,
    s.last_updated AS storage_last_updated
FROM 
    storages s
JOIN 
    users u ON s.user_id = u.user_id
ORDER BY 
    u.username ASC, s.name ASC;
