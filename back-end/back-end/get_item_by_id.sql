CREATE OR REPLACE PROCEDURE get_item_by_id (
    p_item_id IN items.item_id%TYPE,
    p_user_id IN items.user_id%TYPE,
    o_storage_id OUT items.storage_id%TYPE,
    o_category_id OUT items.category_id%TYPE,
    o_name OUT items.name%TYPE,
    o_description OUT items.description%TYPE,
    o_quantity OUT items.quantity%TYPE,
    o_unit_of_measure OUT items.unit_of_measure%TYPE,
    o_low_stock_threshold OUT items.low_stock_threshold%TYPE,
    o_expiry_date OUT items.expiry_date%TYPE,
    o_check_date OUT items.check_date%TYPE,
    o_created_at OUT items.created_at%TYPE,
    o_last_updated OUT items.last_updated%TYPE,
    o_error_message OUT VARCHAR2
)
AS
BEGIN
    o_storage_id := NULL;
    o_category_id := NULL;
    o_name := NULL;
    o_description := NULL;
    o_quantity := NULL;
    o_unit_of_measure := NULL;
    o_low_stock_threshold := NULL;
    o_expiry_date := NULL;
    o_check_date := NULL;
    o_created_at := NULL;
    o_last_updated := NULL;
    o_error_message := NULL;

    BEGIN
        SELECT storage_id, category_id, name, description, quantity, unit_of_measure,
               low_stock_threshold, expiry_date, check_date, created_at, last_updated
        INTO o_storage_id, o_category_id, o_name, o_description, o_quantity, o_unit_of_measure,
             o_low_stock_threshold, o_expiry_date, o_check_date, o_created_at, o_last_updated
        FROM items
        WHERE item_id = p_item_id
          AND user_id = p_user_id; 

    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            o_error_message := 'Articol negasit sau nu aveti permisiunea sa il accesati.';
        WHEN OTHERS THEN
            o_error_message := 'Eroare SQL la citirea detaliilor articolului: ' || SQLCODE || ' - ' || SQLERRM;
    END;

    IF o_name IS NULL AND o_error_message IS NULL THEN
        o_error_message := 'Articol negasit.';
    END IF;

END get_item_by_id;
/