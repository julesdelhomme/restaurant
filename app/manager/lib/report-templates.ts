// app/manager/lib/report-templates.ts

// Fonction qui génère le code HTML brut pour la carte papier
export const generateMenuPdfHtml = (restaurantName: string, logoUrl: string, groupedDishes: Map<string, any[]>) => {
  let categoriesHtml = "";
  
  groupedDishes.forEach((dishes, categoryName) => {
    categoriesHtml += `<h2>${categoryName}</h2>`;
    dishes.forEach(dish => {
      // FIX ACCENTS UTF-8: On utilise bien le FR
      const dishName = dish.name_fr || dish.name || "Plat";
      const dishDesc = dish.description_fr || dish.description || "";
      const price = Number(dish.price || 0).toFixed(2);

      categoriesHtml += `
        <div class="dish-row">
          <div class="dish-main">
            <strong>${dishName}</strong>
            <p>${dishDesc}</p>
          </div>
          <div class="dish-price">${price}â‚¬</div>
        </div>
      `;
    });
  });

  return `
    <!doctype html>
    <html lang="fr">
      <head>
        <meta charset="utf-8" />
        <title>Carte - ${restaurantName}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #111; }
          h1 { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; }
          h2 { color: #333; margin-top: 30px; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
          .logo { display: block; margin: 0 auto 20px; max-width: 120px; }
          .dish-row { display: flex; justify-content: space-between; border-bottom: 1px dotted #eee; padding: 10px 0; }
          .dish-main { max-width: 80%; }
          .dish-main p { font-size: 12px; color: #666; margin: 4px 0 0 0; }
          .dish-price { font-weight: bold; font-size: 16px; }
        </style>
      </head>
      <body>
        ${logoUrl ? `<img src="${logoUrl}" class="logo" />` : ""}
        <h1>${restaurantName}</h1>
        ${categoriesHtml}
        <script>
          // Ouvre automatiquement la fenêtre d'impression
          window.onload = () => window.print();
        </script>
      </body>
    </html>
  `;
};

// Fonction à appeler depuis ton bouton "Imprimer la carte"
export const openPrintableMenu = (restaurantName: string, logoUrl: string, groupedDishes: Map<string, any[]>) => {
  const win = window.open("", "_blank");
  if (!win) {
    alert("Veuillez autoriser les pop-ups dans votre navigateur pour imprimer le menu.");
    return;
  }
  win.document.write(generateMenuPdfHtml(restaurantName, logoUrl, groupedDishes));
  win.document.close();
};