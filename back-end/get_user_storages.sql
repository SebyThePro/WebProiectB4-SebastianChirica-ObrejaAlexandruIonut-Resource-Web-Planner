CREATE OR REPLACE PROCEDURE get_user_storages (
    p_user_id IN storages.user_id%TYPE,
    o_storages_cursor OUT SYS_REFCURSOR,
    o_error_message OUT VARCHAR2
)
AS
BEGIN
    o_error_message := NULL;

    OPEN o_storages_cursor FOR
        SELECT storage_id, name, title_bar_color, title_bar_text_color, created_at, last_updated
        FROM storages
        WHERE user_id = p_user_id
        ORDER BY name ASC;

EXCEPTION
    WHEN NO_DATA_FOUND THEN
        NULL; 
    WHEN OTHERS THEN
        o_error_message := 'Eroare SQL la citirea depozitelor: ' || SQLERRM;
        IF o_storages_cursor IS NOT NULL AND o_storages_cursor%ISOPEN THEN
            CLOSE o_storages_cursor;
        END IF;
        OPEN o_storages_cursor FOR SELECT NULL FROM dual WHERE 1=0;
END get_user_storages;
/