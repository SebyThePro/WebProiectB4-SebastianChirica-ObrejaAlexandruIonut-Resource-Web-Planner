CREATE OR REPLACE PROCEDURE validate_reset_token (
    p_token_hash IN password_reset_tokens.token_hash%TYPE,
    o_user_id OUT password_reset_tokens.user_id%TYPE,
    o_is_valid OUT NUMBER, 
    o_error_message OUT VARCHAR2
)
AS
    v_token_record password_reset_tokens%ROWTYPE;
BEGIN
    o_user_id := NULL;
    o_is_valid := 0;
    o_error_message := NULL;

    BEGIN
        SELECT *
        INTO v_token_record
        FROM password_reset_tokens
        WHERE token_hash = p_token_hash;

        IF v_token_record.used = 1 THEN
            o_error_message := 'Token-ul de resetare a fost deja utilizat.';
            RETURN;
        END IF;

        IF v_token_record.expires_at < CURRENT_TIMESTAMP THEN
            o_error_message := 'Token-ul de resetare a expirat.';
            RETURN;
        END IF;

        o_user_id := v_token_record.user_id;
        o_is_valid := 1;

    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            o_error_message := 'Token de resetare invalid sau negasit.';
        WHEN OTHERS THEN
            o_error_message := 'Eroare BD la validarea token-ului de resetare: ' || SQLERRM;
    END;
END validate_reset_token;
/