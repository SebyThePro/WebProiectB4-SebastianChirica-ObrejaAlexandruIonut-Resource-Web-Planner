CREATE TABLE categories (
    category_id NUMBER PRIMARY KEY,
    user_id NUMBER NOT NULL,
    name VARCHAR2(100) NOT NULL,
    description VARCHAR2(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_category_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT uq_user_category_name UNIQUE (user_id, name)
);

CREATE SEQUENCE categories_seq START WITH 1 INCREMENT BY 1;

CREATE OR REPLACE TRIGGER trg_categories_bir
BEFORE INSERT ON categories
FOR EACH ROW
BEGIN
    IF :NEW.category_id IS NULL THEN
        SELECT categories_seq.NEXTVAL INTO :NEW.category_id FROM dual;
    END IF;
END;
/