const CUISINE_LABEL_OVERRIDES = {
  americaine: "Americain",
  belge: "Belge",
  bio: "Bio",
  brunch: "Brunch",
  burger: "Burger",
  cafe: "Cafe",
  chinoise: "Chinois",
  "fast food": "Fast food",
  francaise: "Francais",
  gastronomique: "Gastronomique",
  healthy: "Healthy",
  indienne: "Indien",
  italienne: "Italien",
  japonaise: "Japonais",
  mexicaine: "Mexicain",
  patisserie: "Patissier",
  pizza: "Pizza",
  "sans gluten": "Sans gluten",
  sushi: "Sushi",
  thailandaise: "Thailandais",
  vegane: "Vegan",
  vegetarienne: "Vegetarien",
  vietnamienne: "Vietnamien",
}

const normalizeCuisineLabel = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()

export const getDisplayCuisineLabel = (value) =>
  CUISINE_LABEL_OVERRIDES[normalizeCuisineLabel(value)] || value
