CREATE OR REPLACE TYPE storage_import_obj AS OBJECT (
    name VARCHAR2(100),
    title_bar_color VARCHAR2(20),
    title_bar_text_color VARCHAR2(20)
);
/

CREATE OR REPLACE TYPE item_import_obj AS OBJECT (
    storage_name VARCHAR2(100),
    category_name VARCHAR2(100),
    name VARCHAR2(100),
    description VARCHAR2(500),
    quantity NUMBER,
    unit_of_measure VARCHAR2(20),
    low_stock_threshold NUMBER,
    expiry_date DATE,
    check_date DATE
);
/

CREATE OR REPLACE TYPE storage_import_table IS TABLE OF storage_import_obj;
/

CREATE OR REPLACE TYPE item_import_table IS TABLE OF item_import_obj;
/