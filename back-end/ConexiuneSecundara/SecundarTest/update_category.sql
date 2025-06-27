CREATE OR REPLACE PROCEDURE update_category (
    p_category_id IN categories.category_id%TYPE,
    p_user_id IN categories.user_id%TYPE,
    p_new_name IN categories.name%TYPE,
    p_new_description IN categories.description%TYPE DEFAULT NULL,
    o_rows_updated OUT NUMBER, 
    o_error_message OUT VARCHAR2
)
AS
    v_current_name categories.name%TYPE;
BEGIN
    o_rows_updated := 0;
    o_error_message := NULL;

    IF p_new_name IS NULL OR LENGTH(TRIM(p_new_name)) = 0 THEN
        o_error_message := 'Noul nume al categoriei nu poate fi gol.';
        RETURN;
    END IF;

    BEGIN
        SELECT name INTO v_current_name
        FROM categories
        WHERE category_id = p_category_id AND user_id = p_user_id;

        IF SQL%NOTFOUND THEN 
             o_error_message := 'Categoria specificata nu exista sau nu aveti permisiunea sa o modificati.';
             RETURN;
        END IF;

        IF LOWER(TRIM(p_new_name)) != LOWER(v_current_name) THEN
            FOR rec IN (SELECT 1 FROM categories 
                        WHERE LOWER(name) = LOWER(TRIM(p_new_name)) 
                          AND user_id = p_user_id
                          AND category_id != p_category_id) 
            LOOP
                o_error_message := 'O alta categorie cu numele "' || TRIM(p_new_name) || '" exista deja pentru acest utilizator.';
                RETURN;
            END LOOP;
        END IF;
    EXCEPTION
        WHEN NO_DATA_FOUND THEN 
            o_error_message := 'Categoria specificata pentru actualizare nu a fost gasita sau nu apartine utilizatorului curent.';
            RETURN;
        WHEN OTHERS THEN
            o_error_message := 'Eroare la verificarea numelui categoriei: ' || SQLERRM;
            RETURN;
    END;


    UPDATE categories
    SET name = TRIM(p_new_name),
        description = TRIM(p_new_description)
    WHERE category_id = p_category_id
      AND user_id = p_user_id; 

    o_rows_updated := SQL%ROWCOUNT;

    IF o_rows_updated = 1 THEN
        COMMIT;
        o_error_message := 'Categoria a fost actualizata cu succes.';
    ELSIF o_rows_updated = 0 AND o_error_message IS NULL THEN
        o_error_message := 'Categoria nu a fost gasita pentru actualizare sau nu apartine utilizatorului curent.';
        ROLLBACK; 
    END IF;

EXCEPTION
    WHEN DUP_VAL_ON_INDEX THEN
        ROLLBACK;
        o_error_message := 'O categorie cu numele "' || p_new_name || '" exista deja (conflict la actualizare).';
    WHEN OTHERS THEN
        ROLLBACK;
        o_rows_updated := 0;
        o_error_message := 'Eroare SQL la actualizarea categoriei: ' || SQLERRM;
END update_category;
/