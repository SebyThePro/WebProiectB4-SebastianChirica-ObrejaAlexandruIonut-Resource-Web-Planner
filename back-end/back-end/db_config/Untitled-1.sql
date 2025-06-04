
BEGIN
    EXECUTE IMMEDIATE 'DROP TRIGGER trg_users_before_insert';
EXCEPTION WHEN OTHERS THEN NULL; END;
/

BEGIN
    EXECUTE IMMEDIATE 'DROP TRIGGER trg_users_before_update';
EXCEPTION WHEN OTHERS THEN NULL; END;
/

BEGIN
    EXECUTE IMMEDIATE 'DROP TABLE users CASCADE CONSTRAINTS';
EXCEPTION WHEN OTHERS THEN NULL; END;
/

BEGIN
    EXECUTE IMMEDIATE 'DROP SEQUENCE users_seq';
EXCEPTION WHEN OTHERS THEN NULL; END;
/

CREATE SEQUENCE users_seq
    START WITH 1
    INCREMENT BY 1
    NOCACHE
    NOCYCLE;
/

CREATE TABLE users (
    user_id NUMBER NOT NULL PRIMARY KEY,
    username VARCHAR2(50) NOT NULL UNIQUE,
    email VARCHAR2(100) NOT NULL UNIQUE,
    password_hash VARCHAR2(255) NOT NULL,
    role VARCHAR2(20) DEFAULT 'user' NOT NULL,
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
/


CREATE OR REPLACE TRIGGER trg_users_before_insert
BEFORE INSERT ON users
FOR EACH ROW
BEGIN
    IF :NEW.user_id IS NULL THEN
        SELECT users_seq.NEXTVAL INTO :NEW.user_id FROM dual;
    END IF;
END;
/


CREATE OR REPLACE TRIGGER trg_users_before_update
BEFORE UPDATE ON users
FOR EACH ROW
BEGIN
    :NEW.last_updated := CURRENT_TIMESTAMP;
END;
/


CREATE OR REPLACE PROCEDURE create_new_user (
    p_username IN VARCHAR2,
    p_email IN VARCHAR2,
    p_password_hash IN VARCHAR2,
    o_user_id OUT NUMBER,
    o_error_message OUT VARCHAR2
)
AS
    v_count_username NUMBER;
    v_count_email NUMBER;
    v_new_user_id NUMBER;
BEGIN
    o_user_id := NULL;
    o_error_message := NULL;

    SELECT COUNT(*) INTO v_count_username FROM users WHERE LOWER(username) = LOWER(p_username);
    IF v_count_username > 0 THEN
        o_error_message := 'Numele de utilizator (' || p_username || ') exista deja.';
        RETURN;
    END IF;

    SELECT COUNT(*) INTO v_count_email FROM users WHERE LOWER(email) = LOWER(p_email);
    IF v_count_email > 0 THEN
        o_error_message := 'Adresa de email (' || p_email || ') este deja inregistrata.';
        RETURN;
    END IF;

    INSERT INTO users (username, email, password_hash, role)
    VALUES (p_username, p_email, p_password_hash, 'user')
    RETURNING user_id INTO v_new_user_id;

    o_user_id := v_new_user_id;
    COMMIT;

EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        o_error_message := 'Eroare neasteptata in baza de date la crearea utilizatorului: ' || SQLERRM;
        o_user_id := NULL;
END create_new_user;
/