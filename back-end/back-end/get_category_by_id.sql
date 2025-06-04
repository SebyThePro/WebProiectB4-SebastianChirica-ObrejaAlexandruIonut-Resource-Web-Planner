CREATE OR REPLACE PROCEDURE get_category_by_id (
    p_category_id IN categories.category_id%TYPE,
    p_user_id IN categories.user_id%TYPE,       
    o_name OUT categories.name%TYPE,
    o_description OUT categories.description%TYPE,
    o_created_at OUT categories.created_at%TYPE,
    o_error_message OUT VARCHAR2
)
AS
BEGIN
    o_name := NULL;
    o_description := NULL;
    o_created_at := NULL;
    o_error_message := NULL;

    BEGIN
        SELECT name, description, created_at
        INTO o_name, o_description, o_created_at
        FROM categories
        WHERE category_id = p_category_id
          AND user_id = p_user_id; 

    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            o_error_message := 'Categorie negasita sau nu aveti permisiunea sa o accesati.';
        WHEN OTHERS THEN
            o_error_message := 'Eroare SQL la citirea detaliilor categoriei: ' || SQLERRM;
    END;

    IF o_name IS NULL AND o_error_message IS NULL THEN
        o_error_message := 'Categorie negasita.';
    END IF;

END get_category_by_id;
/