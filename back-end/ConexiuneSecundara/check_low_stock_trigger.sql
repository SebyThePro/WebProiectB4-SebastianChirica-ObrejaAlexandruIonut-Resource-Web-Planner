
BEGIN
  EXECUTE IMMEDIATE 'DROP PROCEDURE check_low_stock_trigger';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -4043 THEN 
      RAISE;
    END IF;
END;
/

CREATE OR REPLACE PROCEDURE check_low_stock_trigger (
    p_item_id         IN items.item_id%TYPE
) AS
    v_item          items%ROWTYPE;
    v_notification  notifications%ROWTYPE;
    v_alert_message user_alerts.message%TYPE;
BEGIN
    BEGIN
        SELECT * INTO v_notification
        FROM notifications
        WHERE item_id = p_item_id AND notification_type = 'LOW_STOCK' AND is_active = 1 AND ROWNUM = 1;
    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            RETURN; 
    END;

    SELECT * INTO v_item FROM items WHERE item_id = p_item_id;

    IF v_item.quantity < v_notification.threshold AND (v_notification.last_triggered_at IS NULL OR v_notification.last_triggered_at < SYSTIMESTAMP - INTERVAL '1' HOUR) THEN
        
        v_alert_message := 'Atentie! Stocul pentru produsul "' || v_item.name || '" a scazut sub limita de ' || v_notification.threshold || '. Stoc actual: ' || v_item.quantity || ' ' || v_item.unit_of_measure || '.';

        IF v_notification.notify_on_site = 1 THEN
            INSERT INTO user_alerts (user_id, message) VALUES (v_item.user_id, v_alert_message);
        END IF;

        UPDATE notifications SET last_triggered_at = SYSTIMESTAMP WHERE notification_id = v_notification.notification_id;
        
        COMMIT;
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
END check_low_stock_trigger;
/