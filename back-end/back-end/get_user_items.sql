CREATE OR REPLACE PROCEDURE get_user_items (
    p_user_id IN items.user_id%TYPE,
    p_storage_id IN items.storage_id%TYPE DEFAULT NULL, 
    p_category_id IN items.category_id%TYPE DEFAULT NULL,
    o_items_cursor OUT SYS_REFCURSOR,
    o_error_message OUT VARCHAR2
)
AS
    v_sql CLOB;
BEGIN
    o_error_message := NULL;

    v_sql := 'SELECT item_id, user_id, storage_id, category_id, name, description, quantity, unit_of_measure, low_stock_threshold, expiry_date, check_date, created_at, last_updated ' ||
             'FROM items ' ||
             'WHERE user_id = :user_id ';

    IF p_storage_id IS NOT NULL THEN
        v_sql := v_sql || 'AND storage_id = :storage_id ';
    END IF;

    IF p_category_id IS NOT NULL THEN
        v_sql := v_sql || 'AND category_id = :category_id ';
    END IF;

    v_sql := v_sql || 'ORDER BY name ASC'; 

    IF p_storage_id IS NOT NULL AND p_category_id IS NOT NULL THEN
        OPEN o_items_cursor FOR v_sql USING p_user_id, p_storage_id, p_category_id;
    ELSIF p_storage_id IS NOT NULL THEN
        OPEN o_items_cursor FOR v_sql USING p_user_id, p_storage_id;
    ELSIF p_category_id IS NOT NULL THEN
        OPEN o_items_cursor FOR v_sql USING p_user_id, p_category_id;
    ELSE
        OPEN o_items_cursor FOR v_sql USING p_user_id;
    END IF;

EXCEPTION
    WHEN NO_DATA_FOUND THEN
        NULL;
    WHEN OTHERS THEN
        o_error_message := 'Eroare SQL la citirea articolelor: ' || SQLCODE || ' - ' || SQLERRM;
        IF o_items_cursor IS NOT NULL AND o_items_cursor%ISOPEN THEN
            CLOSE o_items_cursor;
        END IF;
        OPEN o_items_cursor FOR SELECT NULL FROM dual WHERE 1=0; 
END get_user_items;
/