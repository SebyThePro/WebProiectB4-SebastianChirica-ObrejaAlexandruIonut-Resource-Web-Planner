CREATE OR REPLACE PROCEDURE update_item (
    p_item_id                   IN items.item_id%TYPE,
    p_user_id                   IN users.user_id%TYPE,
    p_new_name                  IN items.name%TYPE,
    p_new_description           IN items.description%TYPE,
    p_new_quantity              IN items.quantity%TYPE,
    p_new_unit_of_measure       IN items.unit_of_measure%TYPE,
    p_new_low_stock_threshold   IN items.low_stock_threshold%TYPE,
    p_new_expiry_date           IN items.expiry_date%TYPE,
    p_new_check_date            IN items.check_date%TYPE,
    p_new_category_id           IN items.category_id%TYPE,
    o_rows_updated              OUT NUMBER,
    o_error_message             OUT VARCHAR2
) AS
    v_count NUMBER;
BEGIN
    o_rows_updated := 0;
    o_error_message := NULL;

    SELECT COUNT(*) INTO v_count FROM items WHERE item_id = p_item_id AND user_id = p_user_id;
    IF v_count = 0 THEN
        o_error_message := 'Articolul nu exista sau nu aveti permisiunea sa il modificati.';
        RETURN;
    END IF;

    UPDATE items
    SET 
        name = p_new_name,
        description = p_new_description,
        quantity = p_new_quantity,
        unit_of_measure = p_new_unit_of_measure,
        low_stock_threshold = p_new_low_stock_threshold,
        expiry_date = p_new_expiry_date,
        check_date = p_new_check_date,
        category_id = p_new_category_id,
        last_updated = SYSTIMESTAMP
    WHERE 
        item_id = p_item_id; 

    o_rows_updated := SQL%ROWCOUNT;
    COMMIT;

EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        o_error_message := 'Eroare SQL la actualizarea articolului: ' || SQLERRM;
END update_item;
/