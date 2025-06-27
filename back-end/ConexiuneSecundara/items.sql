
BEGIN
    EXECUTE IMMEDIATE 'DROP TRIGGER trg_items_before_insert';
EXCEPTION WHEN OTHERS THEN IF SQLCODE != -4080 THEN RAISE; END IF; END;
/
BEGIN
    EXECUTE IMMEDIATE 'DROP TRIGGER trg_items_before_update';
EXCEPTION WHEN OTHERS THEN IF SQLCODE != -4080 THEN RAISE; END IF; END;
/
BEGIN
    EXECUTE IMMEDIATE 'DROP TABLE items CASCADE CONSTRAINTS';
EXCEPTION WHEN OTHERS THEN IF SQLCODE != -942 THEN RAISE; END IF; END;
/
BEGIN
    EXECUTE IMMEDIATE 'DROP SEQUENCE items_seq';
EXCEPTION WHEN OTHERS THEN IF SQLCODE != -2289 THEN RAISE; END IF; END;
/

CREATE SEQUENCE items_seq
 START WITH     1
 INCREMENT BY   1
 NOCACHE
 NOCYCLE;
/

CREATE TABLE items (
    item_id NUMBER NOT NULL PRIMARY KEY,
    user_id NUMBER NOT NULL,
    storage_id NUMBER NOT NULL, 
    category_id NUMBER,        
    name VARCHAR2(200) NOT NULL,
    description VARCHAR2(1000),
    quantity NUMBER DEFAULT 0 NOT NULL,
    unit_of_measure VARCHAR2(50) NOT NULL,
    low_stock_threshold NUMBER,
    expiry_date DATE,
    check_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_item_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_item_storage FOREIGN KEY (storage_id) REFERENCES storages(storage_id) ON DELETE CASCADE,
    CONSTRAINT fk_item_category FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE SET NULL,
    CONSTRAINT chk_quantity_positive CHECK (quantity >= 0),
    CONSTRAINT chk_low_stock_positive CHECK (low_stock_threshold IS NULL OR low_stock_threshold >= 0)
)
/


CREATE OR REPLACE TRIGGER trg_items_before_insert
BEFORE INSERT ON items
FOR EACH ROW
BEGIN
    IF :NEW.item_id IS NULL THEN
        SELECT items_seq.NEXTVAL INTO :NEW.item_id FROM dual;
    END IF;
    :NEW.last_updated := :NEW.created_at; 
END;
/

CREATE OR REPLACE TRIGGER trg_items_before_update
BEFORE UPDATE ON items
FOR EACH ROW
BEGIN
    :NEW.last_updated := CURRENT_TIMESTAMP;
END;
/

