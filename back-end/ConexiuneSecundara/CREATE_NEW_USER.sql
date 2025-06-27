CREATE OR REPLACE PROCEDURE create_new_user (
    p_username      IN users.username%TYPE,
    p_email         IN users.email%TYPE,
    p_password_hash IN users.password_hash%TYPE,
    o_user_id       OUT users.user_id%TYPE,
    o_error_message OUT VARCHAR2
) AS
    v_count NUMBER;
BEGIN
    o_user_id := NULL;
    o_error_message := NULL;

    SELECT COUNT(*) INTO v_count FROM users WHERE username = p_username;
    IF v_count > 0 THEN
        o_error_message := 'Acest nume de utilizator este deja folosit.';
        RETURN;
    END IF;

    SELECT COUNT(*) INTO v_count FROM users WHERE email = p_email;
    IF v_count > 0 THEN
        o_error_message := 'Aceasta adresa de email este deja folosita.';
        RETURN;
    END IF;

    INSERT INTO users (username, email, password_hash)
    VALUES (p_username, p_email, p_password_hash)
    RETURNING user_id INTO o_user_id;

    COMMIT;

EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        o_error_message := 'Eroare SQL la crearea utilizatorului: ' || SQLERRM;
END create_new_user;
/