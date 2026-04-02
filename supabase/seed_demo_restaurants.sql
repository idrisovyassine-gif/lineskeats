begin;

create temporary table _demo_restaurant_seed (
  seed_key integer primary key,
  name text not null,
  description text not null,
  image text not null,
  address text not null,
  latitude numeric(10,8) not null,
  longitude numeric(11,8) not null,
  wait_time integer not null
) on commit drop;

insert into _demo_restaurant_seed (seed_key, name, description, image, address, latitude, longitude, wait_time) values
  (1, 'Atelier des Burgers Bruxelles', 'Burgers maison, sauces travaillees et service rapide au centre de Bruxelles.', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=80', 'Place De Brouckere 12, 1000 Bruxelles', 50.85034000, 4.35171000, 18),
  (2, 'Napoli Corner Ixelles', 'Pizzas fines, four chaud et recettes italiennes genereuses.', 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=80', 'Chaussée d''Ixelles 88, 1050 Ixelles', 50.83330000, 4.36670000, 22),
  (3, 'Maison Sushi Etterbeek', 'Sushis, rolls croustillants et bowls frais prepares a la minute.', 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=1200&q=80', 'Avenue des Celtes 7, 1040 Etterbeek', 50.83690000, 4.39260000, 20),
  (4, 'Comptoir Belge Saint-Gilles', 'Snacks belges, mitraillettes et plats comfort food en version premium.', 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1200&q=80', 'Chaussée de Waterloo 214, 1060 Saint-Gilles', 50.82550000, 4.35520000, 16),
  (5, 'Basilic & Braise Uccle', 'Cuisine fusion de quartier avec grillades, bowls et desserts gourmands.', 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80', 'Rue Xavier De Bue 43, 1180 Uccle', 50.80360000, 4.33680000, 19),
  (6, 'Le Marche Namur', 'Carte courte, produits frais et plats signatures pour le midi et le soir.', 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80', 'Rue de Fer 56, 5000 Namur', 50.46690000, 4.86750000, 17),
  (7, 'Grill House Charleroi', 'Viandes grillees, sandwiches chauds et portions genereuses.', 'https://images.unsplash.com/photo-1555992336-03a23c7b20ee?auto=format&fit=crop&w=1200&q=80', 'Boulevard Tirou 95, 6000 Charleroi', 50.41080000, 4.44460000, 21),
  (8, 'Pasta Viva Mons', 'Pates, focaccia et cuisine italienne rapide pour une clientele urbaine.', 'https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?auto=format&fit=crop&w=1200&q=80', 'Grand-Place 21, 7000 Mons', 50.45420000, 3.95230000, 15),
  (9, 'Gourmet Wok Liege', 'Wok minute, nouilles sautees et saveurs asiatiques bien marquees.', 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=1200&q=80', 'Place Saint-Lambert 18, 4000 Liège', 50.64530000, 5.57390000, 23),
  (10, 'Burger District Louvain', 'Smash burgers, sides croustillants et boissons maison.', 'https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?auto=format&fit=crop&w=1200&q=80', 'Bondgenotenlaan 54, 3000 Leuven', 50.87980000, 4.70050000, 14),
  (11, 'La Table Seraing', 'Cuisine de quartier, recettes rassurantes et service efficace.', 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=80', 'Rue Ferrer 33, 4100 Seraing', 50.59990000, 5.48300000, 18),
  (12, 'Roma Express Tournai', 'Pizzas, lasagnes et desserts italiens en livraison rapide.', 'https://images.unsplash.com/photo-1548365328-9f547fb0953b?auto=format&fit=crop&w=1200&q=80', 'Rue Royale 14, 7500 Tournai', 50.60560000, 3.38860000, 20),
  (13, 'Tokyo Market Anvers', 'Sushis, udon et street food japonaise dans une ambiance moderne.', 'https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&w=1200&q=80', 'Meir 102, 2000 Antwerpen', 51.21990000, 4.40250000, 24),
  (14, 'Braise & Frites Gand', 'Burger bar convivial avec options gourmandes et frites maison.', 'https://images.unsplash.com/photo-1520072959219-c595dc870360?auto=format&fit=crop&w=1200&q=80', 'Veldstraat 61, 9000 Gent', 51.05360000, 3.72530000, 16),
  (15, 'Casa Verde Bruges', 'Bowls, wraps et recettes veggie dans un cadre lumineux.', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=80', 'Steenstraat 35, 8000 Brugge', 51.20930000, 3.22470000, 13),
  (16, 'Brunch Republic Malines', 'Brunch toute la journee, cafe de specialite et douceurs maison.', 'https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?auto=format&fit=crop&w=1200&q=80', 'Bruul 77, 2800 Mechelen', 51.02870000, 4.48020000, 12),
  (17, 'Le Comptoir Bio Hasselt', 'Cuisine saine, produits frais et recettes colorees.', 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=1200&q=80', 'Demerstraat 41, 3500 Hasselt', 50.93070000, 5.33800000, 14),
  (18, 'Street Taste Courtrai', 'Street food creative, tacos, bowls et sauces signatures.', 'https://images.unsplash.com/photo-1530554764233-e79e16c91d08?auto=format&fit=crop&w=1200&q=80', 'Lange Steenstraat 20, 8500 Kortrijk', 50.82670000, 3.26470000, 19),
  (19, 'Saveurs du Port Ostende', 'Poissons, snacks gourmands et plats rapides a deux pas de la mer.', 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1200&q=80', 'Kapellestraat 39, 8400 Oostende', 51.23000000, 2.91930000, 18),
  (20, 'Bowl Lab Alost', 'Bowls chauds, poke et recettes fusion pour les pauses actives.', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80', 'Kattestraat 12, 9300 Aalst', 50.93600000, 4.03550000, 15),
  (21, 'Le Four de Nivelles', 'Pizzas, plats du jour et desserts maison a partager.', 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=80', 'Rue de Namur 27, 1400 Nivelles', 50.59810000, 4.32850000, 17),
  (22, 'Wok Avenue Verviers', 'Nouilles, riz saute et specialites asiatiques pleines de peps.', 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=1200&q=80', 'Rue du Brou 31, 4800 Verviers', 50.59000000, 5.86260000, 21),
  (23, 'La Pause Gourmet Arlon', 'Cuisine francaise moderne, burgers premium et desserts soignes.', 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=1200&q=80', 'Grand-Rue 54, 6700 Arlon', 49.68330000, 5.81670000, 20),
  (24, 'Food Club Waterloo', 'Carte hybride entre comfort food, bowls et recettes internationales.', 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80', 'Chaussée de Bruxelles 412, 1410 Waterloo', 50.71720000, 4.39830000, 16),
  (25, 'Le Petit Marche Spa', 'Cuisine simple et soignee, formules rapides et produits de saison.', 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=1200&q=80', 'Rue Royale 9, 4900 Spa', 50.49200000, 5.86410000, 14),
  (26, 'Burger Mill Genappe', 'Burgers artisanaux, buns brioches et options bien gourmandes.', 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?auto=format&fit=crop&w=1200&q=80', 'Rue de Bruxelles 28, 1470 Genappe', 50.61140000, 4.45140000, 15),
  (27, 'Casa Latina Dinant', 'Saveurs latino, bowls epices et cuisine colorée en bord de Meuse.', 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1200&q=80', 'Rue Grande 45, 5500 Dinant', 50.25970000, 4.91200000, 18),
  (28, 'Urban Noodles La Louviere', 'Nouilles, gyozas et plats a emporter pour le quotidien.', 'https://images.unsplash.com/photo-1617093727343-374698b1b08d?auto=format&fit=crop&w=1200&q=80', 'Rue Albert 1er 56, 7100 La Louvière', 50.47390000, 4.18720000, 17),
  (29, 'Patisserie & Brunch Wavre', 'Brunch tardif, cafe et desserts signatures dans une ambiance douce.', 'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?auto=format&fit=crop&w=1200&q=80', 'Rue de Bruxelles 33, 1300 Wavre', 50.71670000, 4.61110000, 13),
  (30, 'Comptoir du Centre Bruxelles', 'Carte urbaine, burgers, bowls et boissons maison pour tous les moments.', 'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1200&q=80', 'Rue Neuve 116, 1000 Bruxelles', 50.85580000, 4.35700000, 19);

create temporary table _demo_category_seed (
  category_sort integer primary key,
  category_name text not null
) on commit drop;

insert into _demo_category_seed (category_sort, category_name) values
  (1, 'Signatures'),
  (2, 'Street Food'),
  (3, 'Desserts'),
  (4, 'Boissons');

create temporary table _demo_product_template (
  category_name text not null,
  template_index integer not null,
  name text not null,
  description text not null,
  base_price numeric(10,2) not null,
  image_url text,
  primary key (category_name, template_index)
) on commit drop;

insert into _demo_product_template (category_name, template_index, name, description, base_price, image_url) values
  ('Signatures', 1, 'Burger braise maison', 'Steak grille, cheddar, oignons confits et sauce signature.', 13.50, 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=800&q=80'),
  ('Signatures', 2, 'Pizza tartufata', 'Creme, champignons, mozzarella et touche de truffe.', 15.90, 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80'),
  ('Signatures', 3, 'Curry coco poulet', 'Poulet mijote, riz parfume et sauce coco epicee.', 14.40, 'https://images.unsplash.com/photo-1604908176997-4318b9a3a6fd?auto=format&fit=crop&w=800&q=80'),
  ('Signatures', 4, 'Saumon teriyaki bowl', 'Riz, legumes croquants, saumon glace et sesame.', 16.20, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80'),
  ('Signatures', 5, 'Tacos grille boeuf', 'Boeuf assaisonne, cheddar fondu et sauce douce.', 12.90, 'https://images.unsplash.com/photo-1552332386-f8dd00dc2f85?auto=format&fit=crop&w=800&q=80'),
  ('Signatures', 6, 'Pad thai crevettes', 'Nouilles sautees, cacahuetes et sauce tamarin.', 15.30, 'https://images.unsplash.com/photo-1559314809-0d155014e29e?auto=format&fit=crop&w=800&q=80'),
  ('Signatures', 7, 'Lasagne gratinee', 'Lasagne maison, boeuf mijote et gratin genereux.', 13.80, 'https://images.unsplash.com/photo-1619895092538-128341789043?auto=format&fit=crop&w=800&q=80'),
  ('Signatures', 8, 'Poke thon sesame', 'Thon marine, riz vinaigre et legumes frais.', 14.80, 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80'),

  ('Street Food', 1, 'Wrap poulet croustillant', 'Wrap chaud, laitue, tomates et sauce maison.', 9.90, 'https://images.unsplash.com/photo-1608039755401-742074f0548d?auto=format&fit=crop&w=800&q=80'),
  ('Street Food', 2, 'Loaded fries cheddar', 'Frites croustillantes, cheddar, oignons frits et herbes.', 7.50, 'https://images.unsplash.com/photo-1576107232684-1279f390859f?auto=format&fit=crop&w=800&q=80'),
  ('Street Food', 3, 'Quesadilla fondante', 'Galette grillee, fromage fondant et salsa tomate.', 8.90, 'https://images.unsplash.com/photo-1613514785940-daed07799d9b?auto=format&fit=crop&w=800&q=80'),
  ('Street Food', 4, 'Nuggets croustillants', 'Poulet pane, sauce dip et salade croquante.', 8.50, 'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=800&q=80'),
  ('Street Food', 5, 'Bao boeuf fondant', 'Pain vapeur, boeuf longuement cuit et pickles.', 10.20, 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?auto=format&fit=crop&w=800&q=80'),
  ('Street Food', 6, 'Croquettes fromage', 'Croquettes dorees, creme d''herbes et citron.', 7.90, 'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=800&q=80'),
  ('Street Food', 7, 'Falafel pita', 'Falafels, crudites et sauce tahini.', 8.70, 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=800&q=80'),
  ('Street Food', 8, 'Gyozas poeles', 'Raviolets poeles et sauce soja sesame.', 9.10, 'https://images.unsplash.com/photo-1609501676725-7186f734b24d?auto=format&fit=crop&w=800&q=80'),

  ('Desserts', 1, 'Tiramisu maison', 'Creme legere, biscuit cafe et cacao.', 5.90, 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=800&q=80'),
  ('Desserts', 2, 'Cheesecake speculoos', 'Cheesecake onctueux et crumble speculoos.', 6.40, 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=800&q=80'),
  ('Desserts', 3, 'Mousse chocolat', 'Mousse intense et copeaux de chocolat noir.', 5.30, 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=800&q=80'),
  ('Desserts', 4, 'Cookie caramel', 'Cookie fondant, caramel beurre sale et eclats croustillants.', 4.90, 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=800&q=80'),
  ('Desserts', 5, 'Panna cotta fruits rouges', 'Panna cotta vanille et coulis fruits rouges.', 5.80, 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=800&q=80'),
  ('Desserts', 6, 'Brownie noix de pecan', 'Brownie fondant et noix de pecan caramélisées.', 5.60, 'https://images.unsplash.com/photo-1607920591413-4ec007e70023?auto=format&fit=crop&w=800&q=80'),

  ('Boissons', 1, 'Citronnade maison', 'Boisson fraiche au citron et menthe.', 3.80, 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80'),
  ('Boissons', 2, 'The glace peche', 'Infusion froide peu sucree.', 3.60, 'https://images.unsplash.com/photo-1499638673689-79a0b5115d87?auto=format&fit=crop&w=800&q=80'),
  ('Boissons', 3, 'Limonade hibiscus', 'Limonade florale et acidulee.', 4.10, 'https://images.unsplash.com/photo-1464306076886-da185f6a9d05?auto=format&fit=crop&w=800&q=80'),
  ('Boissons', 4, 'Cola artisanal', 'Cola premium en bouteille.', 3.90, 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=800&q=80'),
  ('Boissons', 5, 'Jus mangue passion', 'Jus frais et tropical.', 4.40, 'https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?auto=format&fit=crop&w=800&q=80'),
  ('Boissons', 6, 'Eau petillante', 'Bouteille 50cl.', 2.90, 'https://images.unsplash.com/photo-1564419434663-c49967363849?auto=format&fit=crop&w=800&q=80');

-- Nettoyage si le script est relance

delete from public.restaurants r
using _demo_restaurant_seed s
where r.name = s.name;

create temporary table _demo_restaurants on commit drop as
with inserted as (
  insert into public.restaurants (
    name,
    description,
    image,
    address,
    latitude,
    longitude,
    wait_time_minutes,
    is_active,
    wait_time_mode,
    base_wait_time,
    max_wait_time,
    capacity_threshold
  )
  select
    name,
    description,
    image,
    address,
    latitude,
    longitude,
    wait_time,
    true,
    'manual',
    greatest(10, wait_time - 3),
    least(60, wait_time + 18),
    12
  from _demo_restaurant_seed
  order by seed_key
  returning id, name
)
select i.id as restaurant_id, s.seed_key, s.name
from inserted i
join _demo_restaurant_seed s on s.name = i.name;

create temporary table _cuisine_pool on commit drop as
select id, row_number() over (order by id) as rn
from public.cuisine_types;

insert into public.restaurant_cuisine_types (restaurant_id, cuisine_type_id)
select dr.restaurant_id, cp.id
from _demo_restaurants dr
join lateral (
  select id
  from _cuisine_pool
  where rn in (
    1 + ((dr.seed_key - 1) % (select count(*) from _cuisine_pool)),
    1 + ((dr.seed_key + 6 - 1) % (select count(*) from _cuisine_pool))
  )
) cp on true
on conflict do nothing;

create temporary table _demo_categories on commit drop as
with inserted as (
  insert into public.categories (restaurant_id, name)
  select dr.restaurant_id, cs.category_name
  from _demo_restaurants dr
  cross join _demo_category_seed cs
  returning id, restaurant_id, name
)
select i.id as category_id, i.restaurant_id, i.name as category_name, cs.category_sort
from inserted i
join _demo_category_seed cs on cs.category_name = i.name;

with product_counts as (
  select category_name, count(*) as template_count
  from _demo_product_template
  group by category_name
),
selected_templates as (
  select
    dc.category_id,
    dc.restaurant_id,
    pt.name,
    (pt.base_price + ((dr.seed_key % 3) * 0.50))::numeric(10,2) as price,
    pt.image_url
  from _demo_categories dc
  join _demo_restaurants dr on dr.restaurant_id = dc.restaurant_id
  join lateral generate_series(
    1,
    case when dc.category_name in ('Desserts', 'Boissons') then 2 else 3 end
  ) as gs(slot) on true
  join product_counts pc on pc.category_name = dc.category_name
  join _demo_product_template pt
    on pt.category_name = dc.category_name
   and pt.template_index = 1 + ((dr.seed_key + dc.category_sort * 5 + gs.slot * 2 - 1) % pc.template_count)
)
insert into public.products (category_id, name, price, image_url)
select category_id, name, price, image_url
from selected_templates;

with signature_products as (
  select
    p.id as product_id,
    c.restaurant_id,
    row_number() over (partition by c.restaurant_id order by p.id) as product_rank
  from public.products p
  join public.categories c on c.id = p.category_id
  where c.restaurant_id in (select restaurant_id from _demo_restaurants)
    and c.name = 'Signatures'
),
inserted_options as (
  insert into public.product_options (product_id, name, required)
  select product_id, 'Options supplementaires', false
  from signature_products
  where product_rank = 1
  returning id
)
insert into public.product_option_items (option_id, name, price)
select io.id, choice_name, choice_price
from inserted_options io
cross join lateral (
  values
    ('Double viande', 3.00::numeric(10,2)),
    ('Fromage en plus', 1.50::numeric(10,2)),
    ('Sauce maison', 0.80::numeric(10,2))
) as choice(choice_name, choice_price);

select
  (select count(*) from _demo_restaurants) as restaurants_crees,
  (select count(*) from public.categories where restaurant_id in (select restaurant_id from _demo_restaurants)) as categories_creees,
  (select count(*) from public.products p join public.categories c on c.id = p.category_id where c.restaurant_id in (select restaurant_id from _demo_restaurants)) as produits_crees;

commit;

