// @ts-nocheck
import React from "react";

type ManagerAccessAlertsProps = {
  [key: string]: any;
};

export default function ManagerAccessAlerts(props: ManagerAccessAlertsProps) {
  const {
    globalManagerNotification,
    isRestaurantLoading,
    managerAccessError,
  } = props;

  return (
<>
        {isRestaurantLoading ? (
          <div className="mb-4 rounded-xl border border-gray-300 bg-white p-3 text-sm font-bold text-gray-700">
            Chargement...
          </div>
        ) : null}
        {!isRestaurantLoading && managerAccessError ? (
          <div className="mb-4 rounded-xl border-2 border-red-700 bg-red-50 p-3 text-sm font-bold text-red-800">
            {managerAccessError}
          </div>
        ) : null}
        {globalManagerNotification?.message ? (
          <div className="mb-4 rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
            Mise \u00e0 jour plateforme : {globalManagerNotification.message}
          </div>
        ) : null}
</>
  );
}
