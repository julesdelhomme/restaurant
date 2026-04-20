// @ts-nocheck
import React from "react";

type ConfigMailProps = {
  [key: string]: any;
};

export default function ConfigMail(props: ConfigMailProps) {
  const {
    activeManagerTab,
    restaurantForm = {},
    setRestaurantForm = () => undefined,
  } = props;

  return (
    <div id="manager-email-config" className={activeManagerTab === "configuration" ? "border border-gray-200 rounded bg-white p-3" : "hidden"}>
      <div className="mb-3">
        <div>
          <div className="font-black">Configuration SMTP & e-mails</div>
          <p className="text-sm text-gray-600 mt-1">
            Utilisez un mot de passe d'application Gmail pour securiser l'envoi des tickets de caisse.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block mb-1 font-bold">Adresse du restaurant</label>
          <input
            type="text"
            value={String(restaurantForm.address || "")}
            onChange={(e) => setRestaurantForm({ ...restaurantForm, address: e.target.value })}
            placeholder="Ex: 12 Rue de la Paix, 75002 Paris"
            className="w-full px-3 py-2 bg-white text-black border border-gray-300"
          />
          <p className="mt-1 text-xs text-gray-600">
            Cette adresse est injectee automatiquement sur les tickets (impression et e-mail), sous le nom du restaurant.
          </p>
        </div>

        <div>
          <label className="block mb-1 font-bold">Gmail SMTP (adresse)</label>
          <input
            type="email"
            value={restaurantForm.smtp_user}
            onChange={(e) => setRestaurantForm({ ...restaurantForm, smtp_user: e.target.value })}
            placeholder="ex: restaurant@gmail.com"
            className="w-full px-3 py-2 bg-white text-black border border-gray-300"
          />
        </div>

        <div>
          <label className="block mb-1 font-bold">Mot de passe d'application Gmail (16 caracteres)</label>
          <input
            type="password"
            value={restaurantForm.smtp_password}
            onChange={(e) => setRestaurantForm({ ...restaurantForm, smtp_password: e.target.value })}
            placeholder="Laisser vide pour conserver l'existant"
            className="w-full px-3 py-2 bg-white text-black border border-gray-300"
          />
        </div>

        <div>
          <label className="block mb-1 font-bold">Objet de l'e-mail</label>
          <input
            type="text"
            value={restaurantForm.email_subject}
            onChange={(e) => setRestaurantForm({ ...restaurantForm, email_subject: e.target.value })}
            placeholder="Votre ticket de caisse - [Nom du Resto]"
            className="w-full px-3 py-2 bg-white text-black border border-gray-300"
          />
        </div>

        <div>
          <label className="block mb-1 font-bold">Message (debut de l'e-mail)</label>
          <textarea
            value={restaurantForm.email_body_header}
            onChange={(e) => setRestaurantForm({ ...restaurantForm, email_body_header: e.target.value })}
            placeholder="Merci de votre visite ! Voici votre ticket :"
            className="w-full px-3 py-2 bg-white text-black border border-gray-300"
            rows={2}
          />
        </div>

        <div className="md:col-span-2">
          <label className="block mb-1 font-bold">Message / pied de page</label>
          <textarea
            value={restaurantForm.email_footer}
            onChange={(e) => setRestaurantForm({ ...restaurantForm, email_footer: e.target.value })}
            placeholder="A bientot !"
            className="w-full px-3 py-2 bg-white text-black border border-gray-300"
            rows={3}
          />
        </div>

        <details className="md:col-span-2 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <summary className="cursor-pointer font-black text-blue-950">Comment configurer votre envoi de mail ?</summary>
          <div className="mt-3 space-y-2 text-sm text-blue-950">
            <p><strong>Etape 1 :</strong> Creez une adresse Gmail dediee a votre restaurant.</p>
            <p><strong>Etape 2 :</strong> Activez la validation en deux etapes dans les parametres Google.</p>
            <p><strong>Etape 3 :</strong> Recherchez "Mots de passe d'application" dans votre compte Google.</p>
            <p><strong>Etape 4 :</strong> Generez un code pour "Application de messagerie" (16 caracteres).</p>
            <p><strong>Etape 5 :</strong> Collez ce code dans le champ "Mot de passe SMTP" de votre interface.</p>
            <p className="pt-1 text-blue-900">
              <strong>Note :</strong> Cela permet d'envoyer les codes de securite a vos clients en toute securite.
            </p>
          </div>
        </details>
      </div>
    </div>
  );
}
