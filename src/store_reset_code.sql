CREATE OR REPLACE PROCEDURE store_reset_code (
    p_email         IN VARCHAR2,
    p_reset_code    IN VARCHAR2,
    o_error_message OUT VARCHAR2
) AS
    v_user_id       users.user_id%TYPE;
BEGIN
    o_error_message := NULL;

    BEGIN
        SELECT user_id INTO v_user_id FROM users WHERE email = p_email;
    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            RETURN;
    END;

    INSERT INTO password_reset_tokens (user_id, token_hash, token_plain, expires_at)
    VALUES (v_user_id, 'not-used-' || password_reset_seq.NEXTVAL, p_reset_code, SYSTIMESTAMP + INTERVAL '15' MINUTE);

    COMMIT;

EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        o_error_message := 'Eroare SQL in store_reset_code: ' || SQLERRM;
END store_reset_code;
/