CREATE OR REPLACE PROCEDURE update_user_password (
    p_user_id IN users.user_id%TYPE,
    p_new_password_hash IN users.password_hash%TYPE,
    o_success OUT NUMBER,
    o_error_message OUT VARCHAR2
)
AS
BEGIN
    o_success := 0;
    o_error_message := NULL;

    UPDATE users
    SET password_hash = p_new_password_hash
    WHERE user_id = p_user_id;

    IF SQL%ROWCOUNT = 0 THEN
        o_error_message := 'Utilizatorul nu a fost gasit pentru actualizarea parolei.';
        ROLLBACK; 
        RETURN;
    END IF;

    o_success := 1;
    COMMIT;
EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        o_success := 0;
        o_error_message := 'Eroare BD la actualizarea parolei: ' || SQLERRM;
END update_user_password;
/