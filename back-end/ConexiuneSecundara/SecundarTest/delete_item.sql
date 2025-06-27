CREATE OR REPLACE PROCEDURE delete_item (
    p_item_id IN items.item_id%TYPE,
    p_user_id IN items.user_id%TYPE,
    o_rows_deleted OUT NUMBER,
    o_error_message OUT VARCHAR2
)
AS
BEGIN
    o_rows_deleted := 0;
    o_error_message := NULL;

    DELETE FROM items
    WHERE item_id = p_item_id
      AND user_id = p_user_id; 

    o_rows_deleted := SQL%ROWCOUNT;

    IF o_rows_deleted = 1 THEN
        COMMIT;
        o_error_message := 'Articolul a fost sters cu succes.';
    ELSE
        o_error_message := 'Articolul nu a fost gasit pentru stergere sau nu aveti permisiunea.';
        ROLLBACK;
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        o_rows_deleted := 0;
        o_error_message := 'Eroare SQL la stergerea articolului: ' || SQLCODE || ' - ' || SQLERRM;
END delete_item;
/