CREATE OR REPLACE PROCEDURE mark_reset_token_as_used (
    p_token_hash IN password_reset_tokens.token_hash%TYPE,
    o_success OUT NUMBER, 
    o_error_message OUT VARCHAR2
)
AS
BEGIN
    o_success := 0;
    o_error_message := NULL;

    UPDATE password_reset_tokens
    SET used = 1
    WHERE token_hash = p_token_hash AND used = 0;

    IF SQL%ROWCOUNT = 0 THEN
        o_error_message := 'Token-ul de resetare nu a fost gasit sau era deja marcat ca utilizat.';
        RETURN;
    END IF;

    o_success := 1;
    COMMIT;
EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        o_success := 0;
        o_error_message := 'Eroare BD la marcarea token-ului ca utilizat: ' || SQLERRM;
END mark_reset_token_as_used;
/