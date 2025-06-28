CREATE OR REPLACE PROCEDURE get_user_storages (
    p_user_id       IN users.user_id%TYPE,
    o_storages_cur  OUT SYS_REFCURSOR,
    o_error_message OUT VARCHAR2
) AS
BEGIN
    o_error_message := NULL;

    OPEN o_storages_cur FOR
        SELECT
            s.storage_id AS "storageId",
            s.name,
            s.title_bar_color AS "titleBarColor",
            s.title_bar_text_color AS "titleBarTextColor",
            (
                SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'itemId' VALUE i.item_id,
                        'name' VALUE i.name,
                        'description' VALUE i.description,
                        'quantity' VALUE i.quantity,
                        'unitOfMeasure' VALUE i.unit_of_measure,
                        'lowStockThreshold' VALUE i.low_stock_threshold,
                        'expiryDate' VALUE TO_CHAR(i.expiry_date, 'YYYY-MM-DD'),
                        'checkDate' VALUE TO_CHAR(i.check_date, 'YYYY-MM-DD'),
                        'categoryId' VALUE i.category_id,
                        'categoryName' VALUE (SELECT c.name FROM categories c WHERE c.category_id = i.category_id)
                    )
                )
                FROM items i
                WHERE i.storage_id = s.storage_id
            ) AS "products"
        FROM
            storages s
        WHERE
            s.user_id = p_user_id
        ORDER BY
            s.name;

EXCEPTION
    WHEN OTHERS THEN
        o_error_message := 'Eroare SQL la preluarea depozitelor: ' || SQLERRM;
END get_user_storages;
/