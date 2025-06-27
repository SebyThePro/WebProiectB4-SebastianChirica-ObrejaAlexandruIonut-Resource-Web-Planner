CREATE OR REPLACE PROCEDURE update_storage (
    p_storage_id IN storages.storage_id%TYPE,
    p_user_id IN storages.user_id%TYPE,
    p_new_name IN storages.name%TYPE,
    p_new_title_bar_color IN storages.title_bar_color%TYPE DEFAULT NULL,
    p_new_title_bar_text_color IN storages.title_bar_text_color%TYPE DEFAULT NULL,
    o_rows_updated OUT NUMBER,
    o_error_message OUT VARCHAR2
)
AS
    v_current_name storages.name%TYPE;
BEGIN
    o_rows_updated := 0;
    o_error_message := NULL;

    IF p_new_name IS NULL OR LENGTH(TRIM(p_new_name)) = 0 THEN
        o_error_message := 'Noul nume al depozitului nu poate fi gol.';
        RETURN;
    END IF;

    BEGIN
        SELECT name INTO v_current_name
        FROM storages
        WHERE storage_id = p_storage_id AND user_id = p_user_id;

        IF SQL%NOTFOUND THEN
             o_error_message := 'Depozitul specificat nu exista sau nu aveti permisiunea sa il modificati.';
             RETURN;
        END IF;

        IF LOWER(TRIM(p_new_name)) != LOWER(v_current_name) THEN
            FOR rec IN (SELECT 1 FROM storages
                        WHERE LOWER(name) = LOWER(TRIM(p_new_name))
                          AND user_id = p_user_id
                          AND storage_id != p_storage_id)
            LOOP
                o_error_message := 'Un alt depozit cu numele "' || TRIM(p_new_name) || '" exista deja pentru acest utilizator.';
                RETURN;
            END LOOP;
        END IF;
    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            o_error_message := 'Depozitul specificat pentru actualizare nu a fost gasit sau nu apartine utilizatorului curent.';
            RETURN;
        WHEN OTHERS THEN
            o_error_message := 'Eroare la verificarea numelui depozitului: ' || SQLERRM;
            RETURN;
    END;

    UPDATE storages
    SET name = TRIM(p_new_name),
        title_bar_color = p_new_title_bar_color,
        title_bar_text_color = p_new_title_bar_text_color
    WHERE storage_id = p_storage_id
      AND user_id = p_user_id;

    o_rows_updated := SQL%ROWCOUNT;

    IF o_rows_updated = 1 THEN
        COMMIT;
        o_error_message := 'Depozitul a fost actualizat cu succes.';
    ELSIF o_rows_updated = 0 AND o_error_message IS NULL THEN
        o_error_message := 'Depozitul nu a fost gasit pentru actualizare sau nu apartine utilizatorului curent (dupa verificare).';
        ROLLBACK;
    END IF;

EXCEPTION
    WHEN DUP_VAL_ON_INDEX THEN
        ROLLBACK;
        o_error_message := 'Un depozit cu numele "' || p_new_name || '" exista deja (conflict la actualizare).';
    WHEN OTHERS THEN
        ROLLBACK;
        o_rows_updated := 0;
        o_error_message := 'Eroare SQL la actualizarea depozitului: ' || SQLERRM;
END update_storage;
/