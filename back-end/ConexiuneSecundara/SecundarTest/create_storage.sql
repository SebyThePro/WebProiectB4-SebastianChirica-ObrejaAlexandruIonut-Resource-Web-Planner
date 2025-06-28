CREATE OR REPLACE PROCEDURE create_storage (
    p_user_id                 IN storages.user_id%TYPE,
    p_name                    IN storages.name%TYPE,
    p_title_bar_color         IN storages.title_bar_color%TYPE,
    p_title_bar_text_color    IN storages.title_bar_text_color%TYPE,
    o_storage_id              OUT storages.storage_id%TYPE,
    o_error_message           OUT VARCHAR2
) AS
    v_count NUMBER;
BEGIN
    o_storage_id := NULL;
    o_error_message := NULL;

    SELECT COUNT(*) INTO v_count
    FROM storages
    WHERE user_id = p_user_id AND LOWER(name) = LOWER(p_name);

    IF v_count > 0 THEN
        o_error_message := 'Un depozit cu acest nume exista deja.';
        RETURN;
    END IF;

    INSERT INTO storages (user_id, name, title_bar_color, title_bar_text_color)
    VALUES (p_user_id, p_name, p_title_bar_color, p_title_bar_text_color)
    RETURNING storage_id INTO o_storage_id;

    COMMIT;

EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        o_error_message := 'Eroare SQL la crearea depozitului: ' || SQLERRM;
END create_storage;
/