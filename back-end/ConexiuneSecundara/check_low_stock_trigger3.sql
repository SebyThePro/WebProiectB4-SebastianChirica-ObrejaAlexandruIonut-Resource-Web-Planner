CREATE OR REPLACE PROCEDURE check_low_stock_trigger (
    p_item_id           IN items.item_id%TYPE,
    o_debug_message     OUT VARCHAR2 
) AS
    v_item          items%ROWTYPE;
    v_notification  notifications%ROWTYPE;
    v_alert_message user_alerts.message%TYPE;
BEGIN
    o_debug_message := 'Verificare pornita pentru item ID ' || p_item_id || '.';

    BEGIN
        SELECT * INTO v_notification
        FROM notifications
        WHERE item_id = p_item_id AND notification_type = 'LOW_STOCK' AND is_active = 1 AND ROWNUM = 1;
    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            o_debug_message := o_debug_message || ' Nicio regula de notificare activa gasita.';
            RETURN;
    END;

    SELECT * INTO v_item FROM items WHERE item_id = p_item_id;
    
    o_debug_message := o_debug_message || ' Stoc actual: ' || v_item.quantity || '. Prag setat: ' || v_notification.threshold || '.';

    IF v_item.quantity < v_notification.threshold THEN
        IF (v_notification.last_triggered_at IS NULL OR v_notification.last_triggered_at < SYSTIMESTAMP - INTERVAL '1' HOUR) THEN
            o_debug_message := o_debug_message || ' CONDITIE INDEPLINITA -> Se insereaza alerta.';
            
            v_alert_message := 'Atentie! Stocul pentru produsul "' || v_item.name || '" a scazut sub limita de ' || v_notification.threshold || '. Stoc actual: ' || v_item.quantity || ' ' || v_item.unit_of_measure || '.';
            INSERT INTO user_alerts (user_id, message) VALUES (v_item.user_id, v_alert_message);
            UPDATE notifications SET last_triggered_at = SYSTIMESTAMP WHERE notification_id = v_notification.notification_id;
            COMMIT;
        ELSE
            o_debug_message := o_debug_message || ' CONDITIE BLOCATA (alerta recenta).';
        END IF;
    ELSE
        o_debug_message := o_debug_message || ' CONDITIE NEINDEPLINITA.';
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        o_debug_message := 'EROARE IN PROCEDURA: ' || SQLERRM;
END check_low_stock_trigger;
/