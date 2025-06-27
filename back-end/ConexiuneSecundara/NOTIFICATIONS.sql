BEGIN
  EXECUTE IMMEDIATE 'DROP TRIGGER trg_notifications_bir';
EXCEPTION WHEN OTHERS THEN
  IF SQLCODE != -4080 THEN RAISE; END IF;
END;
/

BEGIN
  EXECUTE IMMEDIATE 'DROP TABLE notifications CASCADE CONSTRAINTS';
EXCEPTION WHEN OTHERS THEN
  IF SQLCODE != -942 THEN RAISE; END IF;
END;
/

BEGIN
  EXECUTE IMMEDIATE 'DROP SEQUENCE notifications_seq';
EXCEPTION WHEN OTHERS THEN
  IF SQLCODE != -2289 THEN RAISE; END IF;
END;
/

CREATE SEQUENCE notifications_seq
  START WITH 1
  INCREMENT BY 1
  NOCACHE
  NOCYCLE;

CREATE TABLE notifications (
    notification_id         NUMBER PRIMARY KEY,
    user_id                 NUMBER NOT NULL,
    item_id                 NUMBER NOT NULL,
    notification_type       VARCHAR2(20) NOT NULL,
    threshold               NUMBER,
    trigger_time            VARCHAR2(5),
    notify_on_site          NUMBER(1) DEFAULT 0 NOT NULL,
    notify_by_email         NUMBER(1) DEFAULT 0 NOT NULL,
    is_active               NUMBER(1) DEFAULT 1 NOT NULL,
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_triggered_at       TIMESTAMP,
    
    CONSTRAINT fk_notification_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_notification_item FOREIGN KEY (item_id) REFERENCES items(item_id) ON DELETE CASCADE,
    CONSTRAINT chk_notification_type CHECK (notification_type IN ('LOW_STOCK', 'SCHEDULED_UPDATE')),
    CONSTRAINT chk_notify_method CHECK (notify_on_site = 1 OR notify_by_email = 1)
);

CREATE OR REPLACE TRIGGER trg_notifications_bir
BEFORE INSERT ON notifications
FOR EACH ROW
BEGIN
  IF :NEW.notification_id IS NULL THEN
    SELECT notifications_seq.NEXTVAL INTO :NEW.notification_id FROM dual;
  END IF;
END;
/