CREATE OR REPLACE PROCEDURE import_user_data (
    p_user_id           IN users.user_id%TYPE,
    p_storages          IN storage_import_table,
    p_items             IN item_import_table,
    o_error_message     OUT VARCHAR2
) AS
    v_storage_id    storages.storage_id%TYPE;
    v_category_id   categories.category_id%TYPE;
    v_exists        NUMBER;
BEGIN
    o_error_message := NULL;

    IF p_storages IS NOT NULL AND p_storages.COUNT > 0 THEN
        FOR i IN 1..p_storages.COUNT LOOP
            SELECT COUNT(*) INTO v_exists FROM storages WHERE name = p_storages(i).name AND user_id = p_user_id;
            
            IF v_exists = 0 THEN
                INSERT INTO storages (user_id, name, title_bar_color, title_bar_text_color)
                VALUES (p_user_id, p_storages(i).name, p_storages(i).title_bar_color, p_storages(i).title_bar_text_color);
            END IF;
        END LOOP;
    END IF;

    IF p_items IS NOT NULL AND p_items.COUNT > 0 THEN
        FOR i IN 1..p_items.COUNT LOOP
            BEGIN
                SELECT storage_id INTO v_storage_id
                FROM storages
                WHERE name = p_items(i).storage_name AND user_id = p_user_id;
            EXCEPTION
                WHEN NO_DATA_FOUND THEN
                    o_error_message := 'Eroare la import produs: Depozitul "' || p_items(i).storage_name || '" nu a fost gasit.';
                    ROLLBACK;
                    RETURN;
            END;

            SELECT COUNT(*) INTO v_exists FROM items WHERE name = p_items(i).name AND storage_id = v_storage_id AND user_id = p_user_id;

            IF v_exists = 0 THEN
                v_category_id := NULL;
                IF p_items(i).category_name IS NOT NULL THEN
                    BEGIN
                        SELECT category_id INTO v_category_id
                        FROM categories
                        WHERE name = p_items(i).category_name AND user_id = p_user_id;
                    EXCEPTION
                        WHEN NO_DATA_FOUND THEN
                            v_category_id := NULL; 
                    END;
                END IF;

                INSERT INTO items (
                    user_id, storage_id, category_id, name, description, quantity, 
                    unit_of_measure, low_stock_threshold, expiry_date, check_date
                ) VALUES (
                    p_user_id, v_storage_id, v_category_id, p_items(i).name, p_items(i).description, p_items(i).quantity,
                    p_items(i).unit_of_measure, p_items(i).low_stock_threshold, p_items(i).expiry_date, p_items(i).check_date
                );
            END IF;
        END LOOP;
    END IF;

    COMMIT;

EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        o_error_message := 'Eroare tranzactionala la import: ' || SQLERRM;
END import_user_data;
/