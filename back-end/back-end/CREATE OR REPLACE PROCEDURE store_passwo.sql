CREATE OR REPLACE PROCEDURE store_password_reset_token (
    p_user_id IN password_reset_tokens.user_id%TYPE,
    p_token_hash IN password_reset_tokens.token_hash%TYPE,
    p_token_plain IN password_reset_tokens.token_plain%TYPE, 
    p_expires_at IN password_reset_tokens.expires_at%TYPE,
    o_success OUT NUMBER,
    o_error_message OUT VARCHAR2
)
AS
BEGIN
    o_success := 0;
    o_error_message := NULL;
    INSERT INTO password_reset_tokens (user_id, token_hash, token_plain, expires_at, used)
    VALUES (p_user_id, p_token_hash, p_token_plain, p_expires_at, 0);

    o_success := 1;
    COMMIT;
EXCEPTION
    WHEN DUP_VAL_ON_INDEX THEN 
        ROLLBACK;
        o_success := 0;
        o_error_message := 'Eroare: Token-ul generat exista deja. Incercati din nou.';
    WHEN OTHERS THEN
        ROLLBACK;
        o_success := 0;
        o_error_message := 'Eroare BD la stocarea token-ului de resetare: ' || SQLERRM;
END store_password_reset_token;
/