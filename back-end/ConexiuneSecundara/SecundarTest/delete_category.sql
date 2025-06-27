CREATE OR REPLACE PROCEDURE delete_category (
    p_category_id IN categories.category_id%TYPE,
    p_user_id IN categories.user_id%TYPE,
    o_rows_deleted OUT NUMBER, 
    o_error_message OUT VARCHAR2
)
AS
BEGIN
    o_rows_deleted := 0;
    o_error_message := NULL;

    DELETE FROM categories
    WHERE category_id = p_category_id
      AND user_id = p_user_id; 

    o_rows_deleted := SQL%ROWCOUNT;

    IF o_rows_deleted = 1 THEN
        COMMIT;
        o_error_message := 'Categoria a fost stearsa cu succes.';
    ELSE
        o_error_message := 'Categoria nu a fost gasita pentru stergere sau nu aveti permisiunea.';

    END IF;

EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        o_rows_deleted := 0;
        o_error_message := 'Eroare SQL la stergerea categoriei: ' || SQLERRM;
END delete_category;
/