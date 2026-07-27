/**
 * Seed data for the VETS Canada Dartmouth food bank.
 *
 * Full catalog (categories + sub-items) plus a Miscellaneous category.
 * Point value defaults to 1 when not given. A rough weight is derived from
 * the category name; prices are pre-filled from the store price book at seed
 * time (see lib/init.ts). Every category gets an "Other" item appended.
 */

export interface SeedCategory {
  name: string;
  pointValue: number;
  items?: string[];
}

const DEFAULT_POINTS = 1;

const rawCategories: SeedCategory[] = [
  // ----------------------------- CANNED GOODS -----------------------------
  {
    name: "Small Soup",
    pointValue: 1,
    items: ["chicken noodle", "chicken and rice", "mushroom", "tomato", "veg"],
  },
  {
    name: "Large Can Soup",
    pointValue: 2,
    items: [
      "beef", "beef stew", "chicken", "chilli", "clam chowder", "corn chowder",
      "garden minestrone", "hearty veg beef", "Irish stew", "Italian wedding",
      "meatball stews", "mexican stew", "mushroom", "pea", "potato", "tomatoes",
      "veg",
    ],
  },
  {
    name: "Dry Soup Mix",
    pointValue: 2,
    items: ["beef", "blended", "chicken noodle", "hearty/natural", "tomato", "veg"],
  },
  {
    name: "Dried Beans",
    pointValue: 2,
    items: ["barley", "black beans", "lentils", "navy beans", "split peas", "white beans", "yellow eye"],
  },
  {
    name: "Canned Meals",
    pointValue: 2,
    items: [
      "Alphagetti", "Beefaroni", "canned spaghetti", "chilli", "gravy and meatballs",
      "lasagna", "mini ravioli", "ravioli", "Scooby Doo", "spaghetti and meatballs", "Zoodles",
    ],
  },
  {
    name: "Canned Meat",
    pointValue: 1,
    items: [
      "chicken", "chicken haddie", "chicken salad snack", "chunky chicken", "ham",
      "herring", "kipper fillets", "oysters/mussels", "salmon", "salmon snack bowl",
      "sardines", "small tuna", "tuna", "tuna salad snack", "turkey", "vienna sausage",
    ],
  },
  {
    name: "Canned Beans",
    pointValue: 2,
    items: [
      "6 bean medley", "BBQ beans", "beans mixed", "blacked beans", "chick peas",
      "chilli", "green beans", "in brown sugar", "in maple", "in molasses", "in pork",
      "in tomato", "kidney beans", "lentils", "original", "wax beans green",
      "wax beans yellow", "refried beans",
    ],
  },
  {
    name: "Canned Veg",
    pointValue: 2,
    items: [
      "carrots", "corn", "cream corn", "jalapenos/chillis", "mixed veg", "mushroom",
      "peas", "peas and carrots", "potatoes", "wax beans green", "wax beans yellow",
    ],
  },
  {
    name: "Canned Fruit",
    pointValue: 2,
    items: [
      "apple sauce cup", "apple sauce jar", "cocktail", "grapefruit", "individual cups",
      "oranges", "peaches", "pears", "pineapple", "prune", "snack packs (6)",
    ],
  },
  { name: "Spam", pointValue: 1 },
  { name: "Canned Corn Beef", pointValue: 1 },
  { name: "Canned Luncheon Meat", pointValue: 1 },
  {
    name: "Tomato Stuff",
    pointValue: 2,
    items: ["tomato paste", "tomatoes diced", "tomatoes large", "tomatoes small", "tomatoes whole"],
  },
  {
    name: "Broth",
    pointValue: 1,
    items: [
      "beef", "bouillon chicken", "bouillon veg", "chicken", "vegetable",
      "concentrate chicken", "concentrate beef", "concentrate veg",
    ],
  },

  // -------------------------- SIDES & STARCHES ----------------------------
  {
    name: "Mr. Noodles",
    pointValue: 1,
    items: ["beef", "chicken", "mushroom", "oriental", "shrimp", "spicy", "veg"],
  },
  {
    name: "Pasta",
    pointValue: 2,
    items: [
      "bow tie", "fettuccini", "fusilli", "lasagna", "linguini", "macaroni", "orzo",
      "penne", "rigatoni", "rotini", "shells", "spaghetti",
    ],
  },
  {
    name: "Hamburger Helper",
    pointValue: 2,
    items: ["beef", "3 cheese", "cheese burger", "lasagne", "taco", "tuna"],
  },
  {
    name: "Rice",
    pointValue: 2,
    items: [
      "4 cup portion", "bens original rice", "bens street food rice", "heat and serve",
      "individual cups", "minute rice", "original side dish", "rice a roni",
      "seasoned side dish",
    ],
  },
  { name: "Kraft Dinner", pointValue: 2, items: ["box", "cups", "gluten free", "other flavour"] },
  {
    name: "Side Kicks",
    pointValue: 2,
    items: ["butter and herb", "carbonara", "garlic alfredo", "marinara", "parmesan pesto"],
  },
  {
    name: "Mashed Potatoes",
    pointValue: 2,
    items: [
      "baby reds", "butter and herb", "four cheese", "homestyle", "loaded baked",
      "roasted garlic", "sour cream and chives",
    ],
  },
  { name: "Scalloped Potatoes", pointValue: 2, items: ["original", "four cheese"] },
  { name: "Stuffing Mix", pointValue: 2, items: ["chicken", "turkey"] },
  { name: "Taco Kit", pointValue: 2, items: ["combo", "crunch wrap", "hard", "soft"] },
  { name: "Pizza Kit", pointValue: 2 },

  // ------------------------------- SNACKS ---------------------------------
  { name: "Lunchables", pointValue: 1, items: ["bologna", "ham", "pizza"] },
  {
    name: "Granola Bars",
    pointValue: 2,
    items: [
      "chocolate chip", "Go Pure", "Nature Valley Fruit", "Nature Valley Crunch",
      "Nutrigrain Bars", "Protein Bars", "Snack Pack Bites",
    ],
  },
  {
    name: "Large Chips",
    pointValue: 2,
    items: [
      "All Dressed", "BBQ", "dill pickle", "ketchup", "plain", "Pringles",
      "salt and vinegar", "sour cream", "Veggi Sticks", "corn chips",
    ],
  },
  {
    name: "Small Chips",
    pointValue: 1,
    items: [
      "all dressed", "doritos", "sour cream", "cheese sticks", "cheetos", "ketchup",
      "original", "salt and vinegar", "takis",
    ],
  },
  {
    name: "Crackers",
    pointValue: 2,
    items: [
      "bits and bites", "breton", "cheese it", "cracker sandwich", "Crispy Mini's",
      "Crispers", "Gold Fish", "Panache", "rice crackers", "ritz", "Salt Top",
      "Triscuits", "Wheat Thins",
    ],
  },
  { name: "Rice Krispie Squares", pointValue: 2 },
  { name: "Popcorn", pointValue: 2, items: ["boxes", "individual bags", "jars of kernals"] },
  {
    name: "Hickory Farms Collections",
    pointValue: 2,
    items: [
      "delux collection", "holiday selection small", "jelly samples",
      "savory hickory selection", "tea time collection",
    ],
  },
  {
    name: "Cookies",
    pointValue: 2,
    items: [
      "box/can", "celebration/concerto", "chocolate chip", "coconut",
      "dippers stick with dip", "fingers (batons)", "fruit", "fudge", "ginger snaps",
      "girl guide", "graham", "individual bags", "maple", "no sugar added", "oatmeal",
      "oreo", "peanut butter", "sandwich", "shortbread", "snack pack cookies",
      "tea biscuits", "vanilla", "wafer", "wagon wheels", "whippets/viva puffs",
    ],
  },
  {
    name: "Other Stuff",
    pointValue: 2,
    items: [
      "Bear Paws", "dried fruit", "Dunkaroos", "fruit packs for lunches",
      "fruit roll-ups", "go go squeeze", "gum", "nuts", "Passion Flakies", "trail mix",
    ],
  },
  { name: "Candy", pointValue: 1, items: ["hard candy", "mints", "weathers original"] },
  {
    name: "Chocolate Bars",
    pointValue: 1,
    items: [
      "after 8's", "bags of chocolate", "Dairy Milk", "feastables", "Kit Kat",
      "Lilly's caramel", "Lilly's creamy", "Lindt", "Mars", "Milky bars", "Oh Henry",
      "Smarties", "Snickers",
    ],
  },
  { name: "Pudding Cups", pointValue: 2, items: ["butterscotch", "chocolate", "tapioca", "vanilla"] },

  // ------------------------------ BREAKFAST -------------------------------
  {
    name: "Oatmeal",
    pointValue: 2,
    items: ["apple cinnamon", "maple brown sugar", "original", "peaches and cream", "variety pack"],
  },
  {
    name: "Box Cereal",
    pointValue: 2,
    items: [
      "All Bran", "Cup of Cereal", "Cheerios", "Cinnamon Toast Crunch",
      "Crispix/corn squares", "Frosted Flakes", "granola type", "Harvest Crunch",
      "KIDS CEREAL", "mini wheats", "Muslix", "puffed wheat", "raisin bran",
      "rice krispies", "shreddies", "Special K", "Wheat a Bix",
    ],
  },
  { name: "Cheese Whiz", pointValue: 3 },
  { name: "Hash Browns", pointValue: 1 },
  { name: "Honey", pointValue: 2 },
  {
    name: "Jam",
    pointValue: 2,
    items: [
      "apricot/peach", "blueberry", "mini jam individual grape", "mixed berry",
      "raspberry", "rhubarb", "strawberry",
    ],
  },
  { name: "Peanut Butter", pointValue: 2 },
  { name: "Nutella", pointValue: 2 },
  { name: "Pancake Mix", pointValue: 2 },
  { name: "Table Syrup/Pancake", pointValue: 2 },
  {
    name: "Pop Tarts",
    pointValue: 2,
    items: [
      "birthday cake", "blueberry", "chocolate chip", "chocolate fudge",
      "cookies and cream", "raspberry", "strawberry",
    ],
  },
  { name: "Hot Chocolate", pointValue: 2 },
  { name: "Instant Coffee", pointValue: 2, items: ["original", "dark roast"] },
  { name: "Instant Coffee Small", pointValue: 2 },
  { name: "Coffee Beans", pointValue: 2 },
  { name: "Ground Coffee", pointValue: 2 },
  { name: "K Cups", pointValue: 2 },
  { name: "Tea", pointValue: 1, items: ["green tea", "black tea", "orange peko", "loose"] },
  { name: "Drink Syrups", pointValue: 1, items: ["strawberry", "mango"] },
  { name: "Meal Replacement Drinks", pointValue: 3, items: ["boost", "ensure", "premiere protein"] },

  // ------------------------------ CONDIMENTS ------------------------------
  {
    name: "BBQ Sauce",
    pointValue: 2,
    items: [
      "A1 steak sauce", "brown sugar", "chicken and rib", "garlic", "hickory",
      "original", "sweet and sour",
    ],
  },
  { name: "Cabbage", pointValue: 1 },
  { name: "Green Chow Chow", pointValue: 1 },
  { name: "Garlic Puree", pointValue: 2 },
  { name: "Gravy", pointValue: 1, items: ["gravy mix", "gravy in can", "poutine can", "poutine mix"] },
  { name: "Horseradish", pointValue: 1 },
  {
    name: "Hot Sauce",
    pointValue: 2,
    items: [
      "Franks Red Hot Sauce", "Tobasco", "Taco Bell", "Maritime Madness",
      "Fiery Chipolte", "Taco Sauce", "Habanero Mustard", "Fierce Habenero",
      "Garlic Goodness",
    ],
  },
  { name: "Ketchup", pointValue: 2 },
  { name: "Korma Sauce", pointValue: 2 },
  { name: "Mayo", pointValue: 2, items: ["large mayo", "small mayo", "Miracle Whip", "other/spicy"] },
  { name: "Mustard", pointValue: 2, items: ["dijon", "sweet", "yellow"] },
  { name: "Olives", pointValue: 1 },
  {
    name: "Other Sauces",
    pointValue: 2,
    items: ["butter chicken", "burger", "sweet red chilli", "sweet and sour", "curry", "orange ginger"],
  },
  {
    name: "Pickles",
    pointValue: 2,
    items: ["baby dill", "bread and butter", "garlic", "mini", "mustard", "sweet", "Yum Yum"],
  },
  {
    name: "Pasta Sauce",
    pointValue: 2,
    items: [
      "four cheese", "garlic", "herb and spice", "marinara", "mushroom", "original",
      "thick and rich", "tomato basil", "zesty",
    ],
  },
  { name: "Relish", pointValue: 2 },
  { name: "Pizza Sauce", pointValue: 2 },
  {
    name: "Salad Dressing",
    pointValue: 2,
    items: [
      "california style", "Catilina", "caesar", "chipolte ranch", "french", "Italian",
      "poppy seed", "ranch",
    ],
  },
  { name: "Salsa", pointValue: 2 },
  { name: "Sloppy Joe Mix", pointValue: 1 },
  { name: "Soya Sauce", pointValue: 1 },
  {
    name: "Spices",
    pointValue: 2,
    items: [
      "All Dressed", "basil", "bread crumbs", "burger binder", "chilli mix",
      "chilli powder", "cinnamon powder", "curry", "Cuso Gravel BBQ Rub", "fajita",
      "farm market chicken", "garlic powder", "garlic red pepper", "garlic salt",
      "Indian spice kits", "Italian", "maple BBQ", "meatloaf", "onion powder",
      "oregano", "paprika", "parsley", "pasta salad", "pepper", "sloppy Joe", "steak",
      "stir-fry", "Szechwan", "table salt", "taco",
    ],
  },
  { name: "Vinegar", pointValue: 2, items: ["white", "pickling", "balsamic"] },
  { name: "Worcestershire Sauce", pointValue: 2 },

  // ------------------------------- BAKING ---------------------------------
  { name: "Baking Chocolate", pointValue: 2 },
  { name: "Baking Powder", pointValue: 2 },
  { name: "Baking Soda", pointValue: 2 },
  { name: "Biscut Powder", pointValue: 2 },
  { name: "Bread Mix", pointValue: 2 },
  { name: "Cake Mix", pointValue: 2, items: ["chocolate", "rainbow", "vanilla"] },
  { name: "Cake Pops", pointValue: 2 },
  { name: "Condensed Milk", pointValue: 2 },
  { name: "Cooking Oil", pointValue: 3 },
  { name: "Cooking Spray", pointValue: 3 },
  { name: "Cookie Mix", pointValue: 2, items: ["bran", "chocolate", "oatmeal"] },
  { name: "Cranberries", pointValue: 2 },
  { name: "Evaporated Milk", pointValue: 2 },
  { name: "Icing", pointValue: 2, items: ["buttercream", "chocolate", "cream cheese", "vanilla"] },
  { name: "Flour", pointValue: 2, items: ["white", "whole wheat"] },
  {
    name: "Jello",
    pointValue: 1,
    items: ["cherry", "grape", "lemon", "lime", "orange", "raspberry", "strawberry"],
  },
  { name: "Lard", pointValue: 3 },
  { name: "Lemon Juice", pointValue: 2 },
  { name: "Mincemeat", pointValue: 2 },
  { name: "Muffin Mix", pointValue: 2, items: ["bran", "chocolate", "oatmeal", "carrot"] },
  {
    name: "Pudding Mix",
    pointValue: 2,
    items: ["butterscotch", "chocolate", "key lime", "lemon", "vanilla"],
  },
  { name: "Puree Pumpkin", pointValue: 2 },
  { name: "Pie Crust Mix", pointValue: 2 },
  {
    name: "Pie Filling",
    pointValue: 2,
    items: ["butterscotch", "cherry", "chocolate", "key lime", "lemon", "vanilla"],
  },
  { name: "Raisins/Craisins", pointValue: 2 },
  { name: "Splenda", pointValue: 2 },
  { name: "Sugar", pointValue: 2 },
  { name: "Sugar Brown", pointValue: 2 },
  { name: "Syrups", pointValue: 2, items: ["caramel", "chocolate", "strawberry"] },

  // ------------------------------- DRINKS ---------------------------------
  {
    name: "1 Litre Juice",
    pointValue: 2,
    items: [
      "apple", "blueberry", "clamato juice", "cranberry", "fruit punch", "grape",
      "ice tea", "lemon echinacea", "lemonade", "mango passion", "orange", "passion",
      "peach tea", "pineapple juice", "tomato", "watermelon",
    ],
  },
  {
    name: "2 Liter Juice",
    pointValue: 2,
    items: [
      "apple", "cran-black cherry", "cran-blueberry", "cranberry", "cranberry cocktail",
      "cran-grape", "diet cranberry", "fruit punch", "grape", "grapefruit", "lemonade",
      "orange", "pomegranate", "V8", "3L cranberry",
    ],
  },
  {
    name: "Soda",
    pointValue: 1,
    items: [
      "7 Fuse", "7up/sprite", "bubbly", "caffeine free/sugar free", "coke",
      "clamato juice", "Coke Pepsi", "Crush", "Diet Coke", "fruit punch singles",
      "gingerale", "Iced Tea", "Iron Bru", "peach tea", "pineapple", "rootbeer",
      "tonic", "watermelon",
    ],
  },
  { name: "2 Litre Soda", pointValue: 2, items: ["COLA", "GINGERALE", "ROOTBEER", "ORANGE", "LIME"] },
  {
    name: "Energy Drinks",
    pointValue: 1,
    items: ["blue", "green", "orange", "red", "Prime", "small size", "Monster"],
  },
  { name: "Juice Box 10pk", pointValue: 1 },
  { name: "San Pellirino", pointValue: 1, items: ["blood orange", "lemon", "orange"] },

  // --------------------------- FREEZER ITEMS ------------------------------
  { name: "Bagels", pointValue: 0, items: ["multigrain", "white", "whole wheat", "gluten free"] },
  { name: "Bread", pointValue: 0, items: ["white", "whole wheat", "gluten free", "english muffins"] },
  { name: "Buns", pointValue: 0, items: ["ciabatta buns", "croissant", "hamburger", "hot dog"] },
  {
    name: "Frozen Chicken",
    pointValue: 3,
    items: ["chicken legs", "chicken nuggets", "chicken strips", "chicken whole", "chicken wings"],
  },
  {
    name: "Frozen Fish",
    pointValue: 3,
    items: ["frozen breaded fish", "frozen basa fish", "frozen salmon fish", "frozen other"],
  },
  { name: "Frozen Fruit", pointValue: 2, items: ["berries", "mixed"] },
  { name: "Frozen Juice", pointValue: 1, items: ["orange", "limeade", "lemonade", "grape", "frutopia"] },
  {
    name: "Frozen Meals",
    pointValue: 2,
    items: ["chef prep", "lasagna", "mac and beef", "michelinas", "power bowls", "Sheppards Pie"],
  },
  { name: "Frozen Meat Pies", pointValue: 2, items: ["chicken", "beef", "turkey", "tortier"] },
  {
    name: "Frozen Muffins",
    pointValue: 2,
    items: ["banana walnut", "chocolate", "Cran Orange", "Mixed Berry", "poppy seed"],
  },
  { name: "Breakfast Sausage", pointValue: 2 },
  { name: "Frozen Sausage", pointValue: 2 },
  { name: "Bacon", pointValue: 3 },
  { name: "Bagel Bites", pointValue: 1 },
  { name: "Egg Bites", pointValue: 1 },
  { name: "Frozen Burgers", pointValue: 2, items: ["chicken", "hamburgers", "tofu", "veggie"] },
  {
    name: "Frozen Pizza",
    pointValue: 2,
    items: [
      "casa mama", "cheese", "deluxe", "gluten free", "hot honey", "margareta",
      "mushroom", "pepperoni", "pineapple", "veggi",
    ],
  },
  {
    name: "Frozen Vegetables",
    pointValue: 2,
    items: ["broccoli", "carrots", "corn", "green beans", "mix veg", "peas", "peas & carrots"],
  },
  { name: "Falafel", pointValue: 2 },
  { name: "French Fries", pointValue: 2 },
  { name: "Frozen Mashed Potatoes", pointValue: 2 },
  {
    name: "Ground Meat",
    pointValue: 2,
    items: ["beef", "chicken", "lamb", "pork", "turkey", "halal beef", "halal chicken"],
  },
  { name: "Hot Dogs", pointValue: 2, items: ["beef", "chicken", "halal", "original"] },
  { name: "Meatballs", pointValue: 2, items: ["beef", "pork", "turkey"] },
  { name: "Pepperettes", pointValue: 2 },
  { name: "Perogies", pointValue: 2 },
  { name: "Pogo", pointValue: 3 },
  { name: "Pork", pointValue: 3, items: ["chops", "loin", "side", "hoofs"] },
  {
    name: "Sliced Meats",
    pointValue: 1,
    items: [
      "bologna", "chicken", "Chris Brothers sausage", "ham", "pepperoni", "salami",
      "smoke meat", "turkey",
    ],
  },
  { name: "Tofu", pointValue: 1 },
  {
    name: "Waffles",
    pointValue: 2,
    items: ["blueberry", "buttermilk", "chocolate chip", "gluten free", "original"],
  },
  {
    name: "Desserts",
    pointValue: 2,
    items: ["ice cream", "cakes/loafs", "cookies", "dessert cups", "pastry"],
  },

  // ----------------------------- MILK & DAIRY -----------------------------
  { name: "Milk", pointValue: 0, items: ["1L", "2L", "4L"] },
  { name: "Chocolate Milk", pointValue: 0 },
  { name: "Lactose Free Milk", pointValue: 0 },
  { name: "Goat Milk", pointValue: 0 },
  { name: "Almond Breeze", pointValue: 0 },
  {
    name: "Cheese",
    pointValue: 3,
    items: [
      "brie", "cheddar", "cottage", "cream cheese", "gouda", "lactose free",
      "laughing cow", "marble", "montery jack", "moz", "slices", "strings", "swiss",
      "truffle",
    ],
  },
  { name: "Butter", pointValue: 3 },
  {
    name: "Cookie Dough",
    pointValue: 1,
    items: ["beaver tail", "easter", "lucky charms", "chocolate chip", "sugar"],
  },
  { name: "Dip", pointValue: 2, items: ["Jalapeno Yogourt Dip", "spinach dip", "tazikki", "humus"] },
  { name: "Eggs (dozen)", pointValue: 2 },
  { name: "Egg Whites (carton)", pointValue: 3 },
  { name: "Margarine", pointValue: 2 },
  { name: "Yogourt", pointValue: 1, items: ["cups", "containers", "bags"] },
  { name: "Sour Cream", pointValue: 2 },
  { name: "Whipping Cream", pointValue: 3 },

  // -------------------------- PERSONAL HYGIENE ----------------------------
  {
    name: "Personal Hygiene",
    pointValue: 0,
    items: [
      "Baby Food", "Baby Wipes/Wet Wipes", "Bar of Soap", "Body Lotion", "Body Wash",
      "Deodorant", "Pads", "Panty Liners", "Tampons", "Condoms", "Dish Soap", "Floss",
      "Hand Sanitizer", "Handsoap", "Kleenex", "Laundry Soap", "Mousse/hair stuff",
      "Mouthwash", "Paper Towel", "Q-TIPS", "Razors x8", "Shampoo/Conditioner",
      "Shaving Cream", "Shaving Kit Women", "Socks", "Toilet Paper", "Tooth Brush",
      "Toothpaste", "Wash Cloths",
    ],
  },

  // ---------------------------- FRESH PRODUCE -----------------------------
  {
    name: "Fresh Produce",
    pointValue: 0,
    items: [
      "Apples", "bananas", "beans", "beets", "cantaloupe", "carrots", "cherries",
      "cucumbers", "Garden Lettuce", "grapefruit", "jalepenos", "onions", "oranges",
      "papaya", "Potatoes", "rhubarb", "romain lettuce", "sweet potato", "tomatoes",
      "turnip",
    ],
  },

  // ------------------------------- PET FOOD -------------------------------
  {
    name: "Pet Food",
    pointValue: 0,
    items: ["Dog Food", "Dog Treats", "Cat Food", "Cat Treats"],
  },
];

// Add a catch-all Miscellaneous category.
rawCategories.push({ name: "Miscellaneous", pointValue: 1, items: ["misc item"] });

/** Rough average weight (lb) per item, derived from the category name. */
export function defaultWeightFor(categoryName: string): number {
  const n = categoryName.toLowerCase();
  const has = (...k: string[]) => k.some((w) => n.includes(w));
  if (has("frozen", "meat", "chicken", "fish", "pork", "bacon", "sausage", "burger", "beef", "ham", "turkey", "hot dog", "pepperette", "ground", "pogo", "meatball")) return 2;
  if (has("milk", "dairy", "juice", "drink", "soda", "water", "litre", "liter", "pellirino", "energy")) return 2;
  if (has("produce", "potato")) return 1.5;
  if (has("snack", "chip", "cracker", "cookie", "candy", "chocolate", "granola", "popcorn", "pudding", "lunchable")) return 0.5;
  if (has("hygiene", "household", "personal", "soap", "cleaning", "paper", "pet", "shampoo")) return 0.5;
  return 1;
}

/**
 * Normalize categories: ensure each has at least one item (use the category
 * name for single-product categories) and append a deduped "Other" item.
 */
export const SEED_CATEGORIES: {
  name: string;
  pointValue: number;
  weight: number;
  items: string[];
}[] = rawCategories.map((cat) => {
  const baseItems = cat.items && cat.items.length > 0 ? [...cat.items] : [cat.name];
  const seen = new Set(baseItems.map((i) => i.toLowerCase()));
  if (!seen.has("other")) baseItems.push("Other");
  return {
    name: cat.name,
    pointValue: cat.pointValue ?? DEFAULT_POINTS,
    weight: defaultWeightFor(cat.name),
    items: baseItems,
  };
});
