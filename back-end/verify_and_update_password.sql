CREATE OR REPLACE PROCEDURE verify_and_update_password (
    p_email                 IN VARCHAR2,
    p_reset_code            IN VARCHAR2,
    p_new_password_hash     IN VARCHAR2,
    o_success               OUT NUMBER,
    o_error_message         OUT VARCHAR2
) AS
    v_user_id               users.user_id%TYPE;
    v_token_id              password_reset_tokens.id%TYPE;
    v_token_record          password_reset_tokens%ROWTYPE;
BEGIN
    o_success := 0; 
    o_error_message := NULL;

    BEGIN
        SELECT user_id INTO v_user_id FROM users WHERE email = p_email;
    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            o_error_message := 'Email incorect sau cont inexistent.';
            RETURN;
    END;

    BEGIN
        SELECT * INTO v_token_record
        FROM password_reset_tokens
        WHERE user_id = v_user_id
          AND token_plain = p_reset_code;
    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            o_error_message := 'Codul de resetare este invalid.';
            RETURN;
    END;
    
    IF v_token_record.used = 1 THEN
        o_error_message := 'Acest cod de resetare a fost deja utilizat.';
        RETURN;
    END IF;

    IF v_token_record.expires_at < SYSTIMESTAMP THEN
        o_error_message := 'Codul de resetare a expirat. Va rugam solicitati unul nou.';
        RETURN;
    END IF;

    UPDATE users
    SET password_hash = p_new_password_hash
    WHERE user_id = v_user_id;

    UPDATE password_reset_tokens
    SET used = 1
    WHERE id = v_token_record.id;

    COMMIT;
    o_success := 1; 

EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        o_error_message := 'Eroare SQL neasteptata: ' || SQLERRM;
        o_success := 0;
END verify_and_update_password;
/