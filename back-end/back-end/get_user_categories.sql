CREATE OR REPLACE PROCEDURE get_user_categories (
    p_user_id IN users.user_id%TYPE,
    o_categories_cursor OUT SYS_REFCURSOR, 
    o_error_message OUT VARCHAR2
)
AS
BEGIN
    o_error_message := NULL;

    OPEN o_categories_cursor FOR
        SELECT category_id, name, description, created_at
        FROM categories
        WHERE user_id = p_user_id
        ORDER BY name ASC; 

EXCEPTION
    WHEN NO_DATA_FOUND THEN
        NULL;
    WHEN OTHERS THEN
        o_error_message := 'Eroare SQL la citirea categoriilor: ' || SQLERRM;
        IF o_categories_cursor IS NOT NULL AND o_categories_cursor%ISOPEN THEN
            CLOSE o_categories_cursor;
        END IF;
        OPEN o_categories_cursor FOR SELECT NULL FROM dual WHERE 1=0;
END get_user_categories;
/