CREATE OR REPLACE PROCEDURE create_storage (
    p_user_id IN storages.user_id%TYPE,
    p_name IN storages.name%TYPE,
    p_title_bar_color IN storages.title_bar_color%TYPE DEFAULT NULL,
    p_title_bar_text_color IN storages.title_bar_text_color%TYPE DEFAULT NULL,
    o_storage_id OUT storages.storage_id%TYPE,
    o_error_message OUT VARCHAR2
)
AS
BEGIN
    o_storage_id := NULL;
    o_error_message := NULL;

    IF p_name IS NULL OR LENGTH(TRIM(p_name)) = 0 THEN
        o_error_message := 'Numele depozitului nu poate fi gol.';
        RETURN;
    END IF;

    INSERT INTO storages (user_id, name, title_bar_color, title_bar_text_color)
    VALUES (p_user_id, TRIM(p_name), p_title_bar_color, p_title_bar_text_color)
    RETURNING storage_id INTO o_storage_id;

    COMMIT;
    o_error_message := 'Depozit creat cu succes.';

EXCEPTION
    WHEN DUP_VAL_ON_INDEX THEN 
        ROLLBACK;
        o_error_message := 'Un depozit cu numele "' || p_name || '" exista deja pentru acest utilizator.';
        o_storage_id := NULL;
    WHEN OTHERS THEN
        ROLLBACK;
        o_error_message := 'Eroare SQL la crearea depozitului: ' || SQLERRM;
        o_storage_id := NULL;
END create_storage;
/