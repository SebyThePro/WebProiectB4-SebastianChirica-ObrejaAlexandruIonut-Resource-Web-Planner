CREATE OR REPLACE PROCEDURE update_item (
    p_item_id                   IN items.item_id%TYPE,
    p_user_id                   IN users.user_id%TYPE,
    p_storage_id                IN items.storage_id%TYPE,
    p_category_id               IN items.category_id%TYPE DEFAULT NULL,
    p_new_name                  IN items.name%TYPE,
    p_new_description           IN items.description%TYPE DEFAULT NULL,
    p_new_quantity              IN items.quantity%TYPE,
    p_new_unit_of_measure       IN items.unit_of_measure%TYPE,
    p_new_low_stock_threshold   IN items.low_stock_threshold%TYPE DEFAULT NULL,
    p_new_expiry_date           IN items.expiry_date%TYPE DEFAULT NULL,
    p_new_check_date            IN items.check_date%TYPE DEFAULT NULL,
    o_rows_updated              OUT NUMBER,
    o_error_message             OUT VARCHAR2
)
AS
    v_item_exists NUMBER;
    v_storage_belongs_to_user NUMBER;
    v_category_belongs_to_user NUMBER;
BEGIN
    o_rows_updated := 0;
    o_error_message := NULL;

    -- Validari initiale pentru parametrii primiti
    IF p_storage_id IS NULL THEN
        o_error_message := 'ID-ul depozitului este obligatoriu.';
        RETURN;
    END IF;
    IF p_new_name IS NULL OR LENGTH(TRIM(p_new_name)) = 0 THEN
        o_error_message := 'Noul nume al articolului nu poate fi gol.';
        RETURN;
    END IF;
    IF p_new_unit_of_measure IS NULL OR LENGTH(TRIM(p_new_unit_of_measure)) = 0 THEN
        o_error_message := 'Noua unitate de masura este obligatorie.';
        RETURN;
    END IF;
    IF p_new_quantity IS NULL OR p_new_quantity < 0 THEN
        o_error_message := 'Noua cantitate nu poate fi negativa si este obligatorie.';
        RETURN;
    END IF;

    -- Verificam daca item-ul exista si apartine utilizatorului
    SELECT COUNT(*) INTO v_item_exists
    FROM items
    WHERE item_id = p_item_id AND user_id = p_user_id;

    IF v_item_exists = 0 THEN
        o_error_message := 'Articolul specificat nu exista sau nu aveti permisiunea sa il modificati.';
        RETURN;
    END IF;

    -- Verificam daca noul depozit apartine utilizatorului
    SELECT COUNT(*) INTO v_storage_belongs_to_user
    FROM storages
    WHERE storage_id = p_storage_id AND user_id = p_user_id;

    IF v_storage_belongs_to_user = 0 THEN
        o_error_message := 'Noul depozit specificat nu exista sau nu apartine utilizatorului curent.';
        RETURN;
    END IF;

    -- Daca este specificata o categorie, verificam daca apartine utilizatorului
    IF p_category_id IS NOT NULL THEN
        SELECT COUNT(*) INTO v_category_belongs_to_user
        FROM categories
        WHERE category_id = p_category_id AND user_id = p_user_id;

        IF v_category_belongs_to_user = 0 THEN
            o_error_message := 'Noua categorie specificata nu exista sau nu apartine utilizatorului curent.';
            RETURN;
        END IF;
    END IF;

    -- Daca toate verificarile au trecut, facem update
    UPDATE items
    SET name = TRIM(p_new_name),
        description = TRIM(p_new_description),
        storage_id = p_storage_id,
        category_id = p_category_id,
        quantity = p_new_quantity,
        unit_of_measure = TRIM(p_new_unit_of_measure),
        low_stock_threshold = p_new_low_stock_threshold,
        expiry_date = p_new_expiry_date,
        check_date = p_new_check_date,
        last_updated = SYSTIMESTAMP
    WHERE item_id = p_item_id;

    o_rows_updated := SQL%ROWCOUNT;
    COMMIT;

EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        o_rows_updated := 0;
        o_error_message := 'Eroare SQL la actualizarea articolului: ' || SQLCODE || ' - ' || SQLERRM;
END update_item;
/