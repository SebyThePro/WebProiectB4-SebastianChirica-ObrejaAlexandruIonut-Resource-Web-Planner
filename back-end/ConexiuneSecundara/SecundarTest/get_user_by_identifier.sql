CREATE OR REPLACE PROCEDURE get_user_by_identifier (
    p_identifier      IN VARCHAR2,
    o_user_id         OUT users.user_id%TYPE,
    o_username        OUT users.username%TYPE,
    o_email           OUT users.email%TYPE,
    o_password_hash   OUT users.password_hash%TYPE,
    o_role            OUT users.role%TYPE,
    o_error_message   OUT VARCHAR2
) AS
BEGIN
    o_error_message := NULL;
    
    BEGIN
        SELECT user_id, username, email, password_hash, role
        INTO o_user_id, o_username, o_email, o_password_hash, o_role
        FROM users
        WHERE LOWER(username) = LOWER(p_identifier) OR LOWER(email) = LOWER(p_identifier);
    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            o_error_message := 'Utilizatorul sau emailul nu a fost gasit.';
        WHEN OTHERS THEN
            o_error_message := 'Eroare SQL la cautarea utilizatorului: ' || SQLERRM;
    END;
    
END get_user_by_identifier;
/