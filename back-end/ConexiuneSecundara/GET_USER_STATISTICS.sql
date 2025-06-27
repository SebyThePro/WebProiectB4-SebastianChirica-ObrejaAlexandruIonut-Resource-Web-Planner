CREATE OR REPLACE PROCEDURE get_user_statistics (
    p_user_id               IN users.user_id%TYPE,
    o_general_stats_cursor  OUT SYS_REFCURSOR,
    o_low_stock_cursor      OUT SYS_REFCURSOR,
    o_category_dist_cursor  OUT SYS_REFCURSOR,
    o_error_message         OUT VARCHAR2
) AS
BEGIN
    o_error_message := NULL;

    OPEN o_general_stats_cursor FOR
        SELECT
            (SELECT COUNT(*) FROM storages WHERE user_id = p_user_id) AS total_storages,
            (SELECT COUNT(*) FROM items WHERE user_id = p_user_id) AS total_items
        FROM dual;

    OPEN o_low_stock_cursor FOR
        SELECT 
            i.name, 
            i.quantity, 
            i.unit_of_measure, 
            i.low_stock_threshold,
            s.name AS storage_name
        FROM items i
        JOIN storages s ON i.storage_id = s.storage_id
        WHERE i.user_id = p_user_id
          AND i.low_stock_threshold IS NOT NULL
          AND i.quantity < i.low_stock_threshold;
          
    OPEN o_category_dist_cursor FOR
        SELECT 
            c.name AS category_name,
            COUNT(i.item_id) AS number_of_items
        FROM categories c
        LEFT JOIN items i ON c.category_id = i.category_id AND i.user_id = p_user_id
        WHERE c.user_id = p_user_id
        GROUP BY c.name
        ORDER BY number_of_items DESC;

EXCEPTION
    WHEN OTHERS THEN
        o_error_message := 'Eroare la calcularea statisticilor: ' || SQLERRM;
END get_user_statistics;
/