CREATE OR REPLACE PROCEDURE get_all_user_data (
    p_user_id               IN users.user_id%TYPE,
    o_storages_cursor       OUT SYS_REFCURSOR,
    o_items_cursor          OUT SYS_REFCURSOR,
    o_error_message         OUT VARCHAR2
) AS
BEGIN
    o_error_message := NULL;

    OPEN o_storages_cursor FOR
        SELECT storage_id, name, title_bar_color, title_bar_text_color, created_at, last_updated
        FROM storages
        WHERE user_id = p_user_id;

    OPEN o_items_cursor FOR
        SELECT item_id, user_id, storage_id, category_id, name, description, quantity, unit_of_measure, 
               low_stock_threshold, expiry_date, check_date, created_at, last_updated
        FROM items
        WHERE user_id = p_user_id;

EXCEPTION
    WHEN OTHERS THEN
        o_error_message := 'Eroare la extragerea datelor complete: ' || SQLERRM;
END get_all_user_data;
/