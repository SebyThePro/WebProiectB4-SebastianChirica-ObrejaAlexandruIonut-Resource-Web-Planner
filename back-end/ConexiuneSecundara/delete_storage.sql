CREATE OR REPLACE PROCEDURE delete_storage (
    p_storage_id IN storages.storage_id%TYPE,
    p_user_id IN storages.user_id%TYPE,
    o_rows_deleted OUT NUMBER,
    o_error_message OUT VARCHAR2
)
AS
BEGIN
    o_rows_deleted := 0;
    o_error_message := NULL;

    DELETE FROM storages
    WHERE storage_id = p_storage_id
      AND user_id = p_user_id; 
    o_rows_deleted := SQL%ROWCOUNT;

    IF o_rows_deleted = 1 THEN
        COMMIT;
        o_error_message := 'Depozitul si articolele asociate au fost sterse cu succes.';
    ELSE
        o_error_message := 'Depozitul nu a fost gasit pentru stergere sau nu aveti permisiunea.';
        ROLLBACK;
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        o_rows_deleted := 0;
        IF SQLCODE = -2292 THEN
            o_error_message := 'Nu se poate sterge depozitul deoarece contine articole. Stergeti mai intai articolele sau redefiniti constrangerea cheii straine cu ON DELETE CASCADE in tabela items.';
        ELSE
            o_error_message := 'Eroare SQL la stergerea depozitului: ' || SQLERRM;
        END IF;
END delete_storage;
/