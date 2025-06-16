SET LINESIZE 250
SET PAGESIZE 50 

COLUMN ITEM_ID FORMAT 99999 HEADING "ID"
COLUMN ITEM_NAME FORMAT A30 HEADING "Nume Articol" WORD_WRAPPED
COLUMN QUANTITY FORMAT 999999 HEADING "Cant"
COLUMN UNIT_OF_MEASURE FORMAT A10 HEADING "UM"
COLUMN DESCRIPTION FORMAT A30 HEADING "Descriere" WORD_WRAPPED
COLUMN STORAGE_NAME FORMAT A20 HEADING "Depozit" WORD_WRAPPED
COLUMN CATEGORY_NAME FORMAT A20 HEADING "Categorie" WORD_WRAPPED
COLUMN ITEM_CREATED_AT FORMAT A18 HEADING "CreatLa" 


SELECT
    i.item_id,
    i.name AS item_name,
    i.quantity,
    i.unit_of_measure,
    i.description,
    i.low_stock_threshold,
    i.expiry_date,
    i.check_date,
    i.created_at AS item_created_at,
    s.name AS storage_name,
    c.name AS category_name
FROM
    items i
LEFT JOIN
    storages s ON i.storage_id = s.storage_id
LEFT JOIN
    categories c ON i.category_id = c.category_id
WHERE
    i.user_id = (SELECT user_id FROM users WHERE username = 'seby222') 
    AND s.name = 'wedwed';