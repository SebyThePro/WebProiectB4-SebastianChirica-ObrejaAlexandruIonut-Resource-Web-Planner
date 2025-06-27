CREATE TABLE storages (
    storage_id NUMBER PRIMARY KEY,
    user_id NUMBER NOT NULL,
    name VARCHAR2(100) NOT NULL,
    title_bar_color VARCHAR2(20),
    title_bar_text_color VARCHAR2(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_storage_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT uq_user_storage_name UNIQUE (user_id, name)
);

CREATE SEQUENCE storages_seq START WITH 1 INCREMENT BY 1;

CREATE OR REPLACE TRIGGER trg_storages_before_insert
BEFORE INSERT ON storages
FOR EACH ROW
BEGIN
    IF :NEW.storage_id IS NULL THEN
        SELECT storages_seq.NEXTVAL INTO :NEW.storage_id FROM dual;
    END IF;
END;
/