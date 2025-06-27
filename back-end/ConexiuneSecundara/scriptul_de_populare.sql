SET SERVEROUTPUT ON;

DECLARE
    v_user_id           users.user_id%TYPE;
    v_category_id       categories.category_id%TYPE;
    v_storage_id        storages.storage_id%TYPE;
    v_item_id           items.item_id%TYPE;
    v_error_message     VARCHAR2(500);
    v_rows_affected     NUMBER;
    v_hashed_password   users.password_hash%TYPE := '$2b$10$uW75bxcm9PboG7vhUkojy.2mOStlDTjhZoMApyXEz27K4LWL90gZa'; 

    TYPE category_names_t IS TABLE OF VARCHAR2(100);
    v_default_categories category_names_t := category_names_t('Consumabile Birou', 'Electronice Mici', 'Curatenie', 'Piese Auto Uzuale', 'Diverse');

    TYPE storage_names_t IS TABLE OF VARCHAR2(100);
    v_default_storages storage_names_t := storage_names_t('Debara Principala', 'Garaj', 'Sertar Birou', 'Magazie Gradina');

    TYPE item_details_t IS RECORD (
        name items.name%TYPE,
        description items.description%TYPE,
        quantity items.quantity%TYPE,
        unit_of_measure items.unit_of_measure%TYPE,
        low_stock items.low_stock_threshold%TYPE
    );
    TYPE items_array_t IS TABLE OF item_details_t INDEX BY PLS_INTEGER; 
    v_sample_items items_array_t;
    
    temp_item item_details_t;

BEGIN
    temp_item.name := 'Hartie A4'; temp_item.description := 'Top 500 coli, 80g'; temp_item.quantity := 5; temp_item.unit_of_measure := 'top'; temp_item.low_stock := 1;
    v_sample_items(1) := temp_item;

    temp_item.name := 'Pixuri Albastre'; temp_item.description := 'Set 10 bucati'; temp_item.quantity := 2; temp_item.unit_of_measure := 'set'; temp_item.low_stock := 1;
    v_sample_items(2) := temp_item;

    temp_item.name := 'Becuri LED E27'; temp_item.description := '7W, lumina calda'; temp_item.quantity := 10; temp_item.unit_of_measure := 'buc'; temp_item.low_stock := 3;
    v_sample_items(3) := temp_item;

    temp_item.name := 'Detergent Universal'; temp_item.description := '1L, pentru toate suprafetele'; temp_item.quantity := 1; temp_item.unit_of_measure := 'litri'; temp_item.low_stock := 0;
    v_sample_items(4) := temp_item;

    temp_item.name := 'Ulei Motor 5W30'; temp_item.description := 'Bidon 4L'; temp_item.quantity := 1; temp_item.unit_of_measure := 'bidon'; temp_item.low_stock := 0;
    v_sample_items(5) := temp_item;

    temp_item.name := 'Surubelnita cruce'; temp_item.description := 'Marime medie, PH2'; temp_item.quantity := 1; temp_item.unit_of_measure := 'buc'; temp_item.low_stock := 0;
    v_sample_items(6) := temp_item;


    DBMS_OUTPUT.PUT_LINE('Inceput populare date...');

    FOR i IN 1..100 LOOP
        BEGIN
            INSERT INTO users (username, email, password_hash, role)
            VALUES ('testuser' || i, 'testuser' || i || '@exemplu.com', v_hashed_password, 'user')
            RETURNING user_id INTO v_user_id;

            FOR j IN 1..v_default_categories.COUNT LOOP
                BEGIN
                    create_category(
                        p_user_id       => v_user_id,
                        p_name          => v_default_categories(j) || ' ' || i, 
                        p_description   => 'Descriere pentru ' || v_default_categories(j),
                        o_category_id   => v_category_id,
                        o_error_message => v_error_message
                    );
                    IF v_error_message NOT LIKE 'Categorie creata%' AND v_error_message IS NOT NULL THEN
                        DBMS_OUTPUT.PUT_LINE('Eroare la creare categorie pentru user ' || v_user_id || ': ' || v_error_message);
                    END IF;
                EXCEPTION
                    WHEN OTHERS THEN
                         DBMS_OUTPUT.PUT_LINE('Exceptie la creare categorie pentru user ' || v_user_id || ': ' || SQLERRM);
                END;
            END LOOP; 

            FOR k IN 1..v_default_storages.COUNT LOOP
                 BEGIN
                    create_storage(
                        p_user_id                 => v_user_id,
                        p_name                    => v_default_storages(k) || ' ' || i, 
                        p_title_bar_color         => CASE MOD(k,3) WHEN 0 THEN '#FF5733' WHEN 1 THEN '#33FF57' ELSE '#3357FF' END,
                        p_title_bar_text_color    => '#FFFFFF',
                        o_storage_id              => v_storage_id,
                        o_error_message           => v_error_message
                    );
                    IF v_error_message NOT LIKE 'Depozit creat%' AND v_error_message IS NOT NULL THEN
                        DBMS_OUTPUT.PUT_LINE('Eroare la creare depozit pentru user ' || v_user_id || ': ' || v_error_message);
                    ELSE
                        IF v_storage_id IS NOT NULL THEN
                            FOR l_item_idx IN 1..LEAST(v_sample_items.COUNT, 3) LOOP 
                                DECLARE
                                    v_random_category_id categories.category_id%TYPE;
                                BEGIN
                                    BEGIN
                                        SELECT category_id INTO v_random_category_id
                                        FROM (
                                            SELECT category_id FROM categories WHERE user_id = v_user_id ORDER BY DBMS_RANDOM.VALUE
                                        ) WHERE ROWNUM = 1;
                                    EXCEPTION
                                        WHEN NO_DATA_FOUND THEN
                                            v_random_category_id := NULL;
                                    END;

                                    create_item(
                                        p_user_id             => v_user_id,
                                        p_storage_id          => v_storage_id,
                                        p_category_id         => v_random_category_id,
                                        p_name                => v_sample_items(l_item_idx).name || ' (Dep ' || k || ', Usr ' || i || ')',
                                        p_description         => v_sample_items(l_item_idx).description,
                                        p_quantity            => v_sample_items(l_item_idx).quantity + MOD(i,5),
                                        p_unit_of_measure     => v_sample_items(l_item_idx).unit_of_measure,
                                        p_low_stock_threshold => v_sample_items(l_item_idx).low_stock,
                                        p_expiry_date         => CASE WHEN MOD(l_item_idx,2) = 0 THEN SYSDATE + MOD(i,30) ELSE NULL END,
                                        p_check_date          => CASE WHEN MOD(l_item_idx,3) = 0 THEN SYSDATE + 15 + MOD(i,60) ELSE NULL END,
                                        o_item_id             => v_item_id,
                                        o_error_message       => v_error_message
                                    );
                                    IF v_error_message NOT LIKE 'Articol creat%' AND v_error_message IS NOT NULL THEN
                                        DBMS_OUTPUT.PUT_LINE('Eroare la creare item pentru user ' || v_user_id || ' dep ' || v_storage_id || ': ' || v_error_message);
                                    END IF;
                                EXCEPTION
                                    WHEN OTHERS THEN
                                         DBMS_OUTPUT.PUT_LINE('Exceptie la creare item pentru user ' || v_user_id || ' dep ' || v_storage_id || ': ' || SQLERRM);
                                END;
                            END LOOP;
                        END IF;
                    END IF;
                EXCEPTION
                    WHEN OTHERS THEN
                         DBMS_OUTPUT.PUT_LINE('Exceptie la creare depozit pentru user ' || v_user_id || ': ' || SQLERRM);
                END;
            END LOOP; 

        EXCEPTION
            WHEN DUP_VAL_ON_INDEX THEN
                 DBMS_OUTPUT.PUT_LINE('Utilizatorul testuser' || i || ' sau emailul exista deja. Sarim peste...');
            WHEN OTHERS THEN
                 DBMS_OUTPUT.PUT_LINE('Eroare la creare utilizator testuser' || i || ': ' || SQLERRM);
        END;
    END LOOP; 

    COMMIT; 
    DBMS_OUTPUT.PUT_LINE('Popularea datelor finalizata.');
EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        DBMS_OUTPUT.PUT_LINE('Eroare majora in timpul popularii: ' || SQLERRM);
END;
/