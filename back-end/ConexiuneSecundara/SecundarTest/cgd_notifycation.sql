
CREATE OR REPLACE PROCEDURE create_notification (
    p_user_id               IN notifications.user_id%TYPE,
    p_item_id               IN notifications.item_id%TYPE,
    p_notification_type     IN notifications.notification_type%TYPE,
    p_threshold             IN notifications.threshold%TYPE,
    p_trigger_time          IN notifications.trigger_time%TYPE,
    p_notify_on_site        IN notifications.notify_on_site%TYPE,
    p_notify_by_email       IN notifications.notify_by_email%TYPE,
    o_notification_id       OUT notifications.notification_id%TYPE,
    o_error_message         OUT VARCHAR2
) AS
    v_item_belongs_to_user NUMBER;
BEGIN
    o_notification_id := NULL;
    o_error_message := NULL;

    SELECT COUNT(*) INTO v_item_belongs_to_user
    FROM items
    WHERE item_id = p_item_id AND user_id = p_user_id;

    IF v_item_belongs_to_user = 0 THEN
        o_error_message := 'Produsul selectat nu exista sau nu va apartine.';
        RETURN;
    END IF;

    INSERT INTO notifications (
        user_id, item_id, notification_type, threshold, 
        trigger_time, notify_on_site, notify_by_email
    ) VALUES (
        p_user_id, p_item_id, p_notification_type, p_threshold,
        p_trigger_time, p_notify_on_site, p_notify_by_email
    ) RETURNING notification_id INTO o_notification_id;

    COMMIT;

EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        o_error_message := 'Eroare SQL la crearea notificarii: ' || SQLERRM;
END create_notification;
/

CREATE OR REPLACE PROCEDURE get_user_notifications (
    p_user_id               IN users.user_id%TYPE,
    o_notifications_cursor  OUT SYS_REFCURSOR,
    o_error_message         OUT VARCHAR2
) AS
BEGIN
    o_error_message := NULL;
    OPEN o_notifications_cursor FOR
        SELECT 
            n.notification_id, 
            n.item_id, 
            i.name AS item_name,
            n.notification_type, 
            n.threshold,
            n.trigger_time,
            n.notify_on_site,
            n.notify_by_email,
            n.is_active
        FROM notifications n
        JOIN items i ON n.item_id = i.item_id
        WHERE n.user_id = p_user_id
        ORDER BY n.created_at DESC;
EXCEPTION
    WHEN OTHERS THEN
        o_error_message := 'Eroare SQL la citirea notificarilor: ' || SQLERRM;
END get_user_notifications;
/

CREATE OR REPLACE PROCEDURE delete_notification (
    p_notification_id   IN notifications.notification_id%TYPE,
    p_user_id           IN notifications.user_id%TYPE,
    o_rows_deleted      OUT NUMBER,
    o_error_message     OUT VARCHAR2
) AS
BEGIN
    o_rows_deleted := 0;
    o_error_message := NULL;

    DELETE FROM notifications
    WHERE notification_id = p_notification_id AND user_id = p_user_id;

    o_rows_deleted := SQL%ROWCOUNT;
    
    IF o_rows_deleted = 0 THEN
        o_error_message := 'Notificarea nu a fost gasita sau nu aveti permisiunea sa o stergeti.';
    END IF;
    
    COMMIT;
EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        o_error_message := 'Eroare SQL la stergerea notificarii: ' || SQLERRM;
END delete_notification;
/