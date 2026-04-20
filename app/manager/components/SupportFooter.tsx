// @ts-nocheck
import React from "react";
import styles from "./ManagerSaasLayout.module.css";

export default function SupportFooter() {
  return (
    <p className={styles.supportText}>
      En cas de problème, veuillez contacter le{" "}
      <a href="tel:+33760888872" className={styles.supportLink}>
        07 60 88 88 72
      </a>{" "}
      ou envoyer un mail à{" "}
      <a href="mailto:support@elemdho.fr" className={styles.supportLink}>
        support@elemdho.fr
      </a>
      .
    </p>
  );
}
