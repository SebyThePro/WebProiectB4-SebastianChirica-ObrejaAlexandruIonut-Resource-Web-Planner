CREATE OR REPLACE PROCEDURE get_user_by_identifier (
    p_identifier IN VARCHAR2,                -- Poate fi username sau email
    o_user_id OUT users.user_id%TYPE,
    o_username OUT users.username%TYPE,
    o_email OUT users.email%TYPE,
    o_password_hash OUT users.password_hash%TYPE,
    o_role OUT users.role%TYPE,
    o_error_message OUT VARCHAR2
)
AS
BEGIN
    o_error_message := NULL;
    o_user_id := NULL;
    o_username := NULL;
    o_email := NULL;
    o_password_hash := NULL;
    o_role := NULL;

    BEGIN
        SELECT user_id, username, email, password_hash, role
        INTO o_user_id, o_username, o_email, o_password_hash, o_role
        FROM users
        WHERE LOWER(username) = LOWER(p_identifier) OR LOWER(email) = LOWER(p_identifier);

    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            o_error_message := 'Utilizator negasit sau credentiale invalide.';
            RETURN;
        WHEN TOO_MANY_ROWS THEN -- Desi username si email sunt UNIQUE, e o masura de precautie
            o_error_message := 'Date inconsistente pentru identificator (multiple potriviri).';
            RETURN;
        WHEN OTHERS THEN
            o_error_message := 'Eroare BD la cautarea utilizatorului: ' || SQLERRM;
            RETURN;
    END;

    IF o_user_id IS NULL THEN -- Daca totusi nu s-a gasit (redundant daca NO_DATA_FOUND e prins, dar ca siguranta)
        o_error_message := 'Utilizator negasit.';
    END IF;

END get_user_by_identifier;
/