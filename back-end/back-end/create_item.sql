CREATE OR REPLACE PROCEDURE create_item (
    p_user_id IN items.user_id%TYPE,
    p_storage_id IN items.storage_id%TYPE,
    p_category_id IN items.category_id%TYPE DEFAULT NULL,
    p_name IN items.name%TYPE,
    p_description IN items.description%TYPE DEFAULT NULL,
    p_quantity IN items.quantity%TYPE DEFAULT 0,
    p_unit_of_measure IN items.unit_of_measure%TYPE,
    p_low_stock_threshold IN items.low_stock_threshold%TYPE DEFAULT NULL,
    p_expiry_date IN items.expiry_date%TYPE DEFAULT NULL,
    p_check_date IN items.check_date%TYPE DEFAULT NULL,
    o_item_id OUT items.item_id%TYPE,
    o_error_message OUT VARCHAR2
)
AS
    v_storage_exists NUMBER;
    v_category_exists NUMBER;
BEGIN
    o_item_id := NULL;
    o_error_message := NULL;

    IF p_user_id IS NULL THEN
        o_error_message := 'ID-ul utilizatorului este obligatoriu.';
        RETURN;
    END IF;
    IF p_storage_id IS NULL THEN
        o_error_message := 'ID-ul depozitului este obligatoriu.';
        RETURN;
    END IF;
    IF p_name IS NULL OR LENGTH(TRIM(p_name)) = 0 THEN
        o_error_message := 'Numele articolului nu poate fi gol.';
        RETURN;
    END IF;
    IF p_unit_of_measure IS NULL OR LENGTH(TRIM(p_unit_of_measure)) = 0 THEN
        o_error_message := 'Unitatea de masura este obligatorie.';
        RETURN;
    END IF;
    IF p_quantity < 0 THEN
        o_error_message := 'Cantitatea nu poate fi negativa.';
        RETURN;
    END IF;
    IF p_low_stock_threshold IS NOT NULL AND p_low_stock_threshold < 0 THEN
        o_error_message := 'Pragul de stoc minim nu poate fi negativ.';
        RETURN;
    END IF;

    SELECT COUNT(*) INTO v_storage_exists
    FROM storages
    WHERE storage_id = p_storage_id AND user_id = p_user_id;

    IF v_storage_exists = 0 THEN
        o_error_message := 'Depozitul specificat nu exista sau nu apartine utilizatorului curent.';
        RETURN;
    END IF;

    IF p_category_id IS NOT NULL THEN
        SELECT COUNT(*) INTO v_category_exists
        FROM categories
        WHERE category_id = p_category_id AND user_id = p_user_id;

        IF v_category_exists = 0 THEN
            o_error_message := 'Categoria specificata nu exista sau nu apartine utilizatorului curent.';
            RETURN;
        END IF;
    END IF;

    INSERT INTO items (
        user_id,
        storage_id,
        category_id,
        name,
        description,
        quantity,
        unit_of_measure,
        low_stock_threshold,
        expiry_date,
        check_date
    )
    VALUES (
        p_user_id,
        p_storage_id,
        p_category_id,
        TRIM(p_name),
        TRIM(p_description),
        p_quantity,
        TRIM(p_unit_of_measure),
        p_low_stock_threshold,
        p_expiry_date,
        p_check_date
    )
    RETURNING item_id INTO o_item_id;

    COMMIT;
    o_error_message := 'Articol creat cu succes.';

EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        o_error_message := 'Eroare SQL la crearea articolului: ' || SQLCODE || ' - ' || SQLERRM;
        o_item_id := NULL;
END create_item;
/