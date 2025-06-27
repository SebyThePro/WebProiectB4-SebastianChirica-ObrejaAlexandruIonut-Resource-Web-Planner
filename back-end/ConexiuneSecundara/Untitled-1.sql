

BEGIN
  EXECUTE IMMEDIATE 'DROP TRIGGER trg_password_reset_tokens_bir';
EXCEPTION WHEN OTHERS THEN
  IF SQLCODE != -4080 THEN RAISE; END IF; -- trigger doesn't exist
END;
/

BEGIN
  EXECUTE IMMEDIATE 'DROP INDEX idx_reset_token_user';
EXCEPTION WHEN OTHERS THEN
  IF SQLCODE != -1418 THEN RAISE; END IF; -- index doesn't exist
END;
/

BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE password_reset_tokens CASCADE CONSTRAINTS';
EXCEPTION WHEN OTHERS THEN
  IF SQLCODE != -942 THEN RAISE; END IF; -- table doesn't exist
END;
/

BEGIN
  EXECUTE IMMEDIATE 'DROP SEQUENCE password_reset_seq';
EXCEPTION WHEN OTHERS THEN
  IF SQLCODE != -2289 THEN RAISE; END IF; 
END;
/

CREATE SEQUENCE password_reset_seq
  START WITH 1
  INCREMENT BY 1
  NOCACHE
  NOCYCLE;

CREATE TABLE password_reset_tokens (
    id NUMBER PRIMARY KEY,
    user_id NUMBER NOT NULL,
    token_hash VARCHAR2(255) NOT NULL UNIQUE,
    token_plain VARCHAR2(255) UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    used NUMBER(1) DEFAULT 0 NOT NULL, 
    CONSTRAINT fk_user_reset_token FOREIGN KEY (user_id) 
        REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE OR REPLACE TRIGGER trg_password_reset_tokens_bir
BEFORE INSERT ON password_reset_tokens
FOR EACH ROW
BEGIN
  IF :NEW.id IS NULL THEN
    SELECT password_reset_seq.NEXTVAL INTO :NEW.id FROM dual;
  END IF;
END;
/

CREATE INDEX idx_reset_token_user ON password_reset_tokens(user_id);
