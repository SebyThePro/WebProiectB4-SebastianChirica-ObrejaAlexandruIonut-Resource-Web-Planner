CREATE OR REPLACE PROCEDURE create_category (
    p_user_id IN categories.user_id%TYPE,
    p_name IN categories.name%TYPE,
    p_description IN categories.description%TYPE DEFAULT NULL,
    o_category_id OUT categories.category_id%TYPE,
    o_error_message OUT VARCHAR2
)
AS
BEGIN
    o_category_id := NULL;
    o_error_message := NULL;

    IF p_name IS NULL OR LENGTH(TRIM(p_name)) = 0 THEN
        o_error_message := 'Numele categoriei nu poate fi gol.';
        RETURN;
    END IF;

    INSERT INTO categories (user_id, name, description)
    VALUES (p_user_id, TRIM(p_name), TRIM(p_description))
    RETURNING category_id INTO o_category_id;

    COMMIT;
    o_error_message := 'Categorie creata cu succes.'; 

EXCEPTION
    WHEN DUP_VAL_ON_INDEX THEN 
        ROLLBACK;
        o_error_message := 'O categorie cu numele "' || p_name || '" exista deja pentru acest utilizator.';
        o_category_id := NULL;
    WHEN OTHERS THEN
        ROLLBACK;
        o_error_message := 'Eroare SQL la crearea categoriei: ' || SQLERRM;
        o_category_id := NULL;
END create_category;
/