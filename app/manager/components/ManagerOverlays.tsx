// @ts-nocheck
import React from "react";
import ManagerCategorySideModals from "./ManagerCategorySideModals";

type ManagerOverlaysProps = {
  [key: string]: any;
};

export default function ManagerOverlays(props: ManagerOverlaysProps) {
  const {
    confirmDeleteDish,
    dishToDelete,
    forceFirstLoginPasswordChange,
    handleUpdateManagerPassword,
    managerCategorySideModalsProps,
    passwordForm,
    passwordUpdateError,
    passwordUpdateLoading,
    passwordUpdateMessage,
    printFrameRef,
    setDishToDelete,
    setPasswordForm,
    setShowDeleteModal,
    showDeleteModal,
  } = props;

  return (
    <>
      {forceFirstLoginPasswordChange && (
        <div className="fixed inset-0 z-[120] bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-zinc-950 text-slate-900 dark:text-white border-2 border-black rounded-xl p-6">
            <h2 className="text-2xl font-black">Sécurité du compte</h2>
            <p className="mt-2 text-sm text-gray-700">
              Première connexion détectée. Saisissez votre mot de passe actuel, puis définissez un nouveau mot de passe pour continuer.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-3">
              <div>
                <label className="block mb-1 font-bold">Ancien mot de passe</label>
                <input
                  type="password"
                  value={passwordForm.oldPassword}
                  onChange={(e) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      oldPassword: e.target.value,
                    }))
                  }
                  placeholder="Mot de passe actuel"
                  className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                />
              </div>
              <div>
                <label className="block mb-1 font-bold">Nouveau mot de passe</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      newPassword: e.target.value,
                    }))
                  }
                  placeholder="Minimum 8 caractères"
                  className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                />
              </div>
              <div>
                <label className="block mb-1 font-bold">Confirmer le mot de passe</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      confirmPassword: e.target.value,
                    }))
                  }
                  placeholder="Ressaisir le mot de passe"
                  className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                />
              </div>
            </div>
            {passwordUpdateError ? <p className="mt-3 text-sm font-bold text-red-600">{passwordUpdateError}</p> : null}
            {passwordUpdateMessage ? <p className="mt-3 text-sm font-bold text-green-700">{passwordUpdateMessage}</p> : null}
            <button
              type="button"
              onClick={() => void handleUpdateManagerPassword()}
              disabled={passwordUpdateLoading}
              className="mt-4 w-full px-4 py-2 border-2 border-black bg-black text-white font-black rounded disabled:opacity-60"
            >
              {passwordUpdateLoading ? "Mise à jour..." : "Valider le nouveau mot de passe"}
            </button>
          </div>
        </div>
      )}

      <ManagerCategorySideModals {...managerCategorySideModalsProps} />
      <iframe
        ref={printFrameRef}
        title="impression-carte"
        className="fixed pointer-events-none opacity-0 w-0 h-0 border-0"
        aria-hidden="true"
      />

      {showDeleteModal && dishToDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-zinc-950 text-slate-900 dark:text-white border-2 border-black w-full max-w-md p-6">
            <h3 className="text-xl font-black mb-3">Supprimer le plat</h3>
            <p className="mb-4">
              Êtes-vous sûr de vouloir supprimer <strong>{dishToDelete.name}</strong> ?
            </p>
            <div className="flex gap-3">
              <button
                onClick={confirmDeleteDish}
                className="bg-red-600 text-white px-4 py-2 font-black border-2 border-black"
              >
                Supprimer
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDishToDelete(null);
                }}
                className="px-4 py-2 font-black border-2 border-black"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
