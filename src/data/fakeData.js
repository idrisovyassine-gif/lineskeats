export const restaurants = [
  {
    id: 1,
    name: "Casa Miso",
    description: "Bols japonais soyeux, bouillons riches et toppings premium.",
    image:
      "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: 2,
    name: "La Braise",
    description: "Cuisine feu de bois, viandes maturées et accompagnements frais.",
    image:
      "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: 3,
    name: "Verde Loca",
    description: "Bowls veggie modernes, sauces maison, croquant garanti.",
    image:
      "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80",
  },
];

export const categories = [
  { id: 1, restaurant_id: 1, name: "Ramen" },
  { id: 2, restaurant_id: 1, name: "Petites faims" },
  { id: 3, restaurant_id: 2, name: "Grill" },
  { id: 4, restaurant_id: 2, name: "Cotes" },
  { id: 5, restaurant_id: 3, name: "Bowls" },
  { id: 6, restaurant_id: 3, name: "Sides" },
];

export const products = [
  { id: 1, category_id: 1, name: "Shoyu ramen", price: 13.9 },
  { id: 2, category_id: 1, name: "Tonkotsu piment", price: 14.9 },
  { id: 3, category_id: 1, name: "Veggie miso", price: 12.5 },
  { id: 4, category_id: 2, name: "Gyozas croustillants", price: 7.5 },
  { id: 5, category_id: 2, name: "Onigiri saumon", price: 5.9 },
  { id: 6, category_id: 3, name: "Poulet flamme", price: 16.5 },
  { id: 7, category_id: 3, name: "Brochettes yakitori", price: 12.0 },
  { id: 8, category_id: 4, name: "Cote de boeuf (2p)", price: 32.0 },
  { id: 9, category_id: 4, name: "Travers de porc", price: 18.5 },
  { id: 10, category_id: 5, name: "Green protein bowl", price: 13.0 },
  { id: 11, category_id: 5, name: "Sunset quinoa", price: 12.5 },
  { id: 12, category_id: 6, name: "Patates douces roties", price: 6.0 },
  { id: 13, category_id: 6, name: "Pickles maison", price: 4.0 },
];
