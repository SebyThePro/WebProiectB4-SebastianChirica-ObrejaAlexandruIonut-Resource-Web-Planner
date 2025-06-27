CREATE OR REPLACE PROCEDURE get_storage_by_id (
    p_storage_id IN storages.storage_id%TYPE,
    p_user_id IN storages.user_id%TYPE,
    o_name OUT storages.name%TYPE,
    o_title_bar_color OUT storages.title_bar_color%TYPE,
    o_title_bar_text_color OUT storages.title_bar_text_color%TYPE,
    o_created_at OUT storages.created_at%TYPE,
    o_last_updated OUT storages.last_updated%TYPE,
    o_error_message OUT VARCHAR2
)
AS
BEGIN
    o_name := NULL;
    o_title_bar_color := NULL;
    o_title_bar_text_color := NULL;
    o_created_at := NULL;
    o_last_updated := NULL;
    o_error_message := NULL;

    BEGIN
        SELECT name, title_bar_color, title_bar_text_color, created_at, last_updated
        INTO o_name, o_title_bar_color, o_title_bar_text_color, o_created_at, o_last_updated
        FROM storages
        WHERE storage_id = p_storage_id
          AND user_id = p_user_id; 

    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            o_error_message := 'Depozit negasit sau nu aveti permisiunea sa il accesati.';
        WHEN OTHERS THEN
            o_error_message := 'Eroare SQL la citirea detaliilor depozitului: ' || SQLERRM;
    END;

    IF o_name IS NULL AND o_error_message IS NULL THEN
        o_error_message := 'Depozit negasit.';
    END IF;

END get_storage_by_id;
/