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
    v_existing_notif_id notifications.notification_id%TYPE;
BEGIN
    o_error_message := NULL;

    BEGIN
        SELECT notification_id INTO v_existing_notif_id
        FROM notifications
        WHERE user_id = p_user_id 
          AND item_id = p_item_id 
          AND notification_type = p_notification_type;
    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            v_existing_notif_id := NULL;
    END;

    IF v_existing_notif_id IS NOT NULL THEN
        UPDATE notifications
        SET threshold = p_threshold,
            trigger_time = p_trigger_time,
            notify_on_site = p_notify_on_site,
            notify_by_email = p_notify_by_email,
            is_active = 1
        WHERE notification_id = v_existing_notif_id;
        o_notification_id := v_existing_notif_id;
    ELSE
        INSERT INTO notifications (
            user_id, item_id, notification_type, threshold, 
            trigger_time, notify_on_site, notify_by_email
        ) VALUES (
            p_user_id, p_item_id, p_notification_type, p_threshold,
            p_trigger_time, p_notify_on_site, p_notify_by_email
        ) RETURNING notification_id INTO o_notification_id;
    END IF;

    COMMIT;

EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        o_error_message := 'Eroare SQL la salvarea notificarii: ' || SQLERRM;
END create_notification;
/