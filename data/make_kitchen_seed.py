"""Builds data/kitchen_seed.json — the starter kitchen recipes transcribed from
the printed recipe PDFs (Google Drive: 05_Products, Menu, _Downloads), for the
one-time "Import starter recipes" button on kitchen.html (v1.23.0).

Amounts are as printed, except the Packers par-bake dough, which is rescaled
from the sheet's 15 x 195 g to 10 x 470 g by its own baker's percentages.
Re-run after editing:  python3 data/make_kitchen_seed.py
"""
import json, os

FRIDAY, PACKERS = "k_dough_friday", "k_dough_packers_parbake"


def ing(name, amount="", unit="", notes="", section="", reserve_pct=""):
    return {"section": section, "name": name, "amount": str(amount), "unit": unit,
            "reserve_pct": str(reserve_pct), "notes": notes}


def recipe(kitchen_id, name, kind, ingredients, method, **kw):
    r = {"kitchen_id": kitchen_id, "name": name, "family": "", "variant": "", "kind": kind,
         "status": "active", "yield_qty": "", "yield_unit": "", "ball_weight_g": "",
         "portion_9": "", "portion_14": "", "portion_unit": "", "bake_temp": "", "bake_time": "",
         "holding": "", "method": "\n".join(method), "notes": "", "source": ""}
    r.update(kw)
    r["ingredients"] = ingredients
    return r


R = []

# ---------------------------------------------------------------- doughs
R.append(recipe(
    FRIDAY, "Distiller's Dough", "dough", variant="Pizza Friday (55%)",
    yield_qty="20", yield_unit="balls", ball_weight_g=200,
    bake_temp="750–760°F deck", bake_time="120–150 sec",
    holding="Cold bulk 18–20 hr at 38–40°F",
    ingredients=[
        ing('Tipo "00" flour', 2530, "g", reserve_pct=10),
        ing("Water, warm (75–80°F)", 1390, "g"),
        ing("Fine sea salt", 71, "g"),
        ing("Active dry yeast (Costco ADY)", 9.5, "g"),
        ing("Distiller's yeast (DADY)", 1.2, "g", "a small pinch, for ester and distillery aroma"),
    ],
    method=[
        "Bloom: Pour all of the warm water into the mixing tub. Add the salt, ADY and DADY directly to the water, stir gently and let sit 5–10 minutes until creamy and dissolved.",
        "Mix and autolyse: Add the flour, holding back the reserve. Stir with a scraper or hand until no dry pockets remain (under 90 seconds). Cover and rest 20 minutes.",
        "Fold set 1 (+10 min): Dust about half the reserve flour over the dough. Do a 4-corner stretch-and-fold, flip smooth side up and rest 10 minutes.",
        "Fold set 2 (+20 min): Dust the rest of the reserve flour, repeat the 4 folds and rest 10 minutes.",
        "Fold set 3 (+30 min): Final 4-corner fold, then tuck into a satiny, smooth boule.",
        "Room-temp kickstart: Seal the tub and rest at room temperature (68–72°F) for 2 hours.",
        "Cold bulk: Move the sealed tub to the walk-in or fridge (38–40°F) for 18–20 hours.",
        "Portion and proof: Pull the cold dough 3–4 hours before service. Scale into balls, roll tight on an unfloured bench and pinch the bottoms shut. Proof in trays until the dough reaches about 62–65°F and is relaxed and extensible.",
        "Stretch and bake: Stretch on a 50/50 semolina/00 mix to 9 inches, keeping the rim. Launch onto the 750–760°F deck, rotate 180° around 60 seconds, and bake 120–150 seconds until leopard-spotted and crisp.",
    ],
    notes="Pizza Friday dough. No sugar, oil, honey or malt: added fats and sugars scorch bitter-black on a 760°F deck before the crust bakes through.\n"
          "Hold back 10% of the flour and work it in across the fold sets, so the initial dough is wetter.",
    source="Amounts: distillers_dough_hand_mix_master.pdf (20-pizza column, 200 g balls). Method: 2026-10-01_Recipe_Distillers_Dough_55Pct_Hydration_Master.pdf.",
))

R.append(recipe(
    PACKERS, "Distiller's Dough", "dough", variant="Packers par-bake (68%)",
    yield_qty="10", yield_unit="balls", ball_weight_g=470,
    holding="Cold retard 20–24 hr at 38–40°F. Cool par-baked crusts completely before wrapping.",
    ingredients=[
        ing('Tipo "00" flour', 2744, "g", reserve_pct=10),
        ing("Water, warm (90–95°F)", 1866, "g", "about 1/8 of it for the yeast bloom, the rest in the tub"),
        ing("Fine sea salt", 77, "g"),
        ing("Active dry yeast (Red Star ADY)", 13.1, "g"),
        ing("Distiller's yeast (DADY)", 0.8, "g", "a generous pinch"),
    ],
    method=[
        "Bloom: Bloom the ADY and DADY in about an eighth of the warm water for 5–10 minutes, until actively foaming.",
        "Mix: Dissolve the salt in the rest of the water in the bulk tub. Add the bloomed yeast and the flour, holding back the reserve. Stir under 90 seconds until shaggy with no dry flour. Cover and rest 20 minutes.",
        "Fold 1 (+0:20): Dust about a third of the reserve flour on top. With wet hands, stretch each side (north, east, south, west) up and into the center. Dust another third, flip smooth side up and tuck the edges under. Rest 30 minutes.",
        "Fold 2 (+0:50): Dust the last of the reserve flour and do a second 4-point stretch-and-fold. Invert smooth side up and tuck tight to build surface tension. Rest 30 minutes.",
        "Coil lift (+1:20): Lift the whole mass from the center until the ends coil underneath; rotate 90° and repeat once. Seal the tub and rest 1 hour at about 70°F.",
        "Cold retard: Walk-in or fridge (38–40°F) for 20–24 hours.",
        "Ball: Pull the tub 2.5–3 hours before baking. Scale into balls, ball tightly, seal in proofing boxes and bench proof 1.5–2 hours until soft, puffy and extensible.",
        "Par-bake (Thursday): Stretch and bake the bare skin on the stone deck just until the crust sets without coloring the top. Cool completely on wire racks before wrapping.",
        "Finish (service): Top the par-baked crust with sauce and cheese and fire until the cheese melts and micro-blisters.",
    ],
    notes="Packers-day dough, par-baked on Thursday. No sugar or oil.\n"
          "The source sheet is written for 15 × 195 g (9-inch) balls; these amounts are rescaled to 10 × 470 g (14-inch) by the sheet's own baker's percentages (68% water, 2.8% salt, about 0.48% ADY, 10% of the flour held back).\n"
          "STILL TO CONFIRM for 14-inch: the sheet's times are for 9-inch skins — par-bake 20–30 sec at 760–800°F, finish 90–120 sec at 650–700°F.",
    source="2026-10-01_Recipe_Distillers_Dough_68Pct_Hydration_NoKnead.pdf",
))

R.append(recipe(
    "k_dough_neapolitan_760", "760°F Neapolitan Dough", "dough", status="archived",
    yield_qty="20", yield_unit="balls", ball_weight_g=200,
    bake_temp="750–760°F deck", bake_time="120–150 sec", holding="Cold bulk 22 hr at 38–40°F",
    ingredients=[
        ing('Tipo "00" flour', 2480, "g"),
        ing("Water, cool (55–60°F)", 1438, "g"),
        ing("Fine sea salt", 69, "g"),
        ing("Instant dry yeast (IDY)", 7.4, "g"),
    ],
    method=[
        "Mix and knead: Dissolve the salt in the cool water. Whisk the yeast into the flour, add to the water, and mix on low 2–3 minutes, then medium 6–8 minutes until smooth (dough temp 70–72°F).",
        "Room-temp kickstart: One master ball in a lightly oiled or floured tub, covered, 2 hours at 68–72°F.",
        "Cold bulk: 22 hours at 38–40°F.",
        "Portion and ball: 3–4 hours before service, divide into balls, roll tight and seal the seams.",
        "Final proof: 2–3 hours at room temperature, to 62–65°F and doubled.",
        "Bake: Stretch on 50/50 00 and fine semolina. 750–760°F deck, rotate at 60 seconds, 120–150 seconds total.",
    ],
    notes="The predecessor formula (58% hydration, instant yeast, no distiller's yeast). Replaced by Distiller's Dough; kept for the record.",
    source="high_temp_pizza_recipe_760F.pdf",
))

# ---------------------------------------------------------------- sauces
SMOKY_METHOD_FRESH = [
    "Sauté aromatics: Heat the oil in a wide pot over medium. Cook the onion 6–7 minutes until soft and translucent, then the garlic for 1 minute.",
    "Collapse the tomatoes: Add the tomatoes and a pinch of salt. Raise to medium-high and cook, stirring often, 10–15 minutes until they break down and release their liquid.",
    "Deglaze: Add the bourbon and scrape up the browned bits. Boil hard 2–3 minutes to cook off the raw alcohol.",
    "Reduce: Stir in the paprika, pepper flakes, salt and black pepper. Simmer uncovered on low, stirring now and then, until the tomato water is gone and the sauce is a thick, deep-red reduction (25–35 minutes for a single batch, 40–45 for a double).",
    "Blend: Pulse with an immersion blender to a spreadable texture, rustic or smooth.",
    "Cool and rest: Cool completely, cover and refrigerate overnight before baking.",
]
R.append(recipe(
    "k_sauce_smoky_bourbon_fresh", "Smoky Bourbon Tomato Reduction", "sauce",
    family="Smoky Bourbon Tomato", variant="Fresh tomatoes",
    yield_qty="2", yield_unit="cups", bake_temp="Simmer, uncovered", bake_time="25–35 min (40–45 for a double)",
    holding="Refrigerate overnight before use; the smoke and bourbon deepen.",
    ingredients=[
        ing("Fresh paste tomatoes (Roma or plum), cored & roughly chopped", 3, "lb"),
        ing("Olive oil", 2, "tbsp"),
        ing("Yellow onion, finely diced", 1, "small"),
        ing("Garlic, minced", 3, "clove"),
        ing("Bourbon", "1/4", "cup"),
        ing("Smoked paprika", 1, "tsp"),
        ing("Crushed red pepper flakes", 1, "tsp"),
        ing("Sea salt", 1, "tsp", "adjust to taste at the end"),
        ing("Black pepper, freshly cracked", "1/2", "tsp"),
    ],
    method=SMOKY_METHOD_FRESH,
    notes="Made with whatever was on hand, so there are fresh and canned versions. The fresh-tomato sheets all use these ratios: 3 lb is a single batch (about 2 cups); 5–6 lb is the double (about 4 cups) — set Batches to 2.\n"
          "Pairings from the sheets: smoked mozzarella, chorizo and caramelized onions; or brisket or wood-fired chicken with pickled red onion. No per-pie portion on the sheets.",
    source="smoky_bourbon_sauce_3lbs.pdf; smoky_bourbon_sauce_fresh_tomatoes.pdf; smoky_bourbon_tomato_sauce.pdf; 2026-09-10_Recipe_Smoky_Bourbon_Tomato_Pizza_Sauce.pdf",
))
R.append(recipe(
    "k_sauce_smoky_bourbon_canned", "Smoky Bourbon Tomato Reduction", "sauce",
    family="Smoky Bourbon Tomato", variant="Canned San Marzano",
    yield_qty="1", yield_unit="batch", bake_temp="Gentle simmer", bake_time="25 min",
    ingredients=[
        ing("Olive oil", 2, "tbsp"),
        ing("Yellow onion, finely diced", 1, "small"),
        ing("Garlic, minced", 3, "clove"),
        ing("San Marzano tomatoes", 1, "can (28 oz)"),
        ing("Bourbon", "1/4", "cup"),
        ing("Smoked paprika", 1, "tsp"),
        ing("Crushed red pepper flakes", 1, "tsp"),
        ing("Sea salt", 1, "tsp"),
        ing("Black pepper", "1/2", "tsp"),
    ],
    method=[
        "Sauté: Heat the oil over medium and cook the onion about 5 minutes, until translucent.",
        "Garlic and bourbon: Add the garlic for 1 minute, then the bourbon; simmer 2 minutes to burn off the alcohol.",
        "Simmer: Add the tomatoes, paprika, pepper flakes, salt and pepper. Simmer gently about 25 minutes until thickened.",
    ],
    notes="From a dishgen.com printout written for a home oven; the sauce carries over as is. The sheet gives no yield or per-pie portion.",
    source="bourbon-pizza-sauce.pdf",
))

R.append(recipe(
    "k_sauce_garlic_vodka_red", "Garlic Vodka Red Sauce", "sauce",
    yield_qty="64-68", yield_unit="oz", portion_9="2", portion_unit="oz",
    bake_temp="Gentle simmer, uncovered", bake_time="20–30 min",
    holding="Cool completely and refrigerate. Best made one day ahead. Portion cold or cool.",
    ingredients=[
        ing("Unsalted butter", 4, "tbsp"),
        ing("Extra virgin olive oil", 4, "tbsp"),
        ing("Shallots, finely minced", 2, "medium"),
        ing("Crushed red pepper flakes", 1, "tsp"),
        ing("Tomato paste", 6, "oz"),
        ing("Sturgeon Spirits house garlic vodka", 1, "cup"),
        ing("Whole peeled San Marzano tomatoes", 2, "can (28 oz)"),
        ing("Heavy cream", "3/4", "cup"),
        ing("Parmigiano-Reggiano, finely grated", 1, "cup"),
        ing("Kosher salt", "1 1/2", "tsp", "then adjust to taste"),
        ing("Black pepper, coarse ground", "1/2", "tsp"),
    ],
    method=[
        "Sweat the shallots: Heat the butter and oil over medium. Add the shallots and pepper flakes and cook 4–5 minutes, stirring often, until soft and translucent. Do not brown.",
        "Caramelize the paste: Add the tomato paste and cook 4–5 minutes, stirring and pressing it into the fat, until it turns from bright red to deep brick red. Do not burn.",
        "Add the vodka: Turn off the burner and move the pot away from any open flame. Add the vodka, return to medium heat, scrape the bottom and simmer 3–4 minutes until the alcohol smell is gone and the mixture is thick and glossy.",
        "Add and blend the tomatoes: Add the tomatoes, salt and pepper and blend smooth with an immersion blender, keeping the head submerged.",
        "Reduce: Bring to a gentle boil, then simmer uncovered on low 20–30 minutes, stirring occasionally, until thick and spreadable — it should sit on a spoon rather than run off.",
        "Finish: Lowest heat. Slowly stir in the cream and cook gently 2–3 minutes without a hard boil. Off heat, stir in the Parmesan until smooth. Taste and adjust.",
        "Cool, weigh, store: Cool completely, weigh (expect 64–68 oz; don't reduce below 60), cover and refrigerate.",
    ],
    notes="2 oz per 9-inch pie (confirmed November 2026; an older sheet said 3 oz). Stir well before portioning.",
    source="Sturgeon_Spirits_One_Pot_Garlic_Vodka_Pizza_Sauce.pdf; Sturgeon_Spirits_Garlic_Vodka_Pizza_Sauce.pdf",
))

R.append(recipe(
    "k_sauce_fresh_roma_garlic_vodka", "Fresh Roma Two-Stage Garlic Vodka Sauce", "sauce",
    yield_qty="2", yield_unit="cups", portion_9="1.5-1.75", portion_unit="oz",
    bake_temp="Simmer, uncovered", bake_time="15–18 min",
    holding="Cool completely to room temperature before saucing.",
    ingredients=[
        ing("Fresh Roma tomatoes, cored, seeded & coarsely crushed", 2, "lb", section="Fresh produce & spirit"),
        ing("Garlic vodka — hot deglaze", "1/4", "cup", section="Fresh produce & spirit"),
        ing("Garlic vodka — off-heat finish", 2, "tbsp", section="Fresh produce & spirit"),
        ing("Shallot, finely minced", 1, "small", section="Fresh produce & spirit"),
        ing("Extra virgin olive oil", 2, "tbsp", section="Aromatics & reduction base"),
        ing("Double-concentrated tomato paste", 2, "tbsp", section="Aromatics & reduction base"),
        ing("Fresh Italian oregano, chopped", 1, "tbsp", "divided: about ¾ in the simmer, the rest at the finish", section="Aromatics & reduction base"),
        ing("Fresh basil leaves", "6-8", "", "bruise the stems for the simmer; chiffonade the leaves for the finish", section="Aromatics & reduction base"),
        ing("Fine sea salt", 1, "tsp", "or to taste", section="Aromatics & reduction base"),
        ing("Crushed red pepper flakes", "1/4", "tsp", section="Aromatics & reduction base"),
        ing("Heavy cream", 2, "tbsp", section="Off-heat emulsion"),
        ing("Parmigiano-Reggiano, microplaned", 3, "tbsp", section="Off-heat emulsion"),
    ],
    method=[
        "Prep the Romas: Halve lengthwise, V-cut out the stem core and scoop out the watery seed cavities. Pulse coarsely in a food processor or crush by hand.",
        "Sweat and caramelize: Heat the oil in a wide pan over medium-low. Sweat the shallot and pepper flakes 3 minutes until soft. Stir in the tomato paste and cook 2 minutes until deep brick red.",
        "Deglaze (stage 1): Add the deglazing garlic vodka and scrape up the fond. Simmer 2–3 minutes until reduced by half and the alcohol vapor is gone.",
        "Simmer and reduce: Add the tomatoes, salt, basil stems and most of the oregano. Simmer uncovered on medium-low 15–18 minutes, until a spoon leaves a clear trail across the pan.",
        "Finish off heat (stage 2): Pull the pan off the heat and discard the basil stems. Whisk in the finishing vodka, cream, Parmesan, the rest of the oregano and the basil chiffonade until silky.",
        "Cool and portion: Cool completely. Spread thin for a crisp underside.",
    ],
    notes="The sheet says this batch covers 7–8 nine-inch pies, but 2 cups at 1.5–1.75 oz per pie works out to 9–10. Worth checking which is right (the yield may be smaller than 2 cups once reduced).",
    source="fresh garlic red sauce.pdf",
))

R.append(recipe(
    "k_sauce_peach_vodka", "Peach Vodka Pizza Sauce", "sauce",
    yield_qty="22-24", yield_unit="oz", portion_9="55-60", portion_unit="g",
    bake_temp="Simmer, uncovered", bake_time="10–12 min, then 2 min with the cream",
    holding="Cool to room temperature before saucing.",
    ingredients=[
        ing("San Marzano tomatoes, drained thoroughly", 1, "can (28 oz)", section="Tomato foundation"),
        ing("Double-concentrated tomato paste", 45, "g", section="Tomato foundation"),
        ing("Unsalted butter", 20, "g", section="Aromatics & bloom"),
        ing("Extra virgin olive oil", 15, "mL", section="Aromatics & bloom"),
        ing("Crushed red pepper flakes", "1/2", "tsp", "bloomed in the fat", section="Aromatics & bloom"),
        ing("Shallots, minced fine", 45, "g", section="Aromatics & bloom"),
        ing("Garlic, microplaned", 2, "clove", section="Aromatics & bloom"),
        ing("Lemon peel, yellow zest only (2–3 inch)", 1, "strip", section="Aromatics & bloom"),
        ing("Peach vodka — stage 1 (deglaze)", 60, "mL", section="Alcohol & emulsion"),
        ing("Heavy cream (36–40% fat)", 60, "mL", section="Alcohol & emulsion"),
        ing("Peach vodka — stage 2 (off heat)", 30, "mL", section="Alcohol & emulsion"),
        ing("Parmigiano-Reggiano, microplaned", 25, "g", section="Alcohol & emulsion"),
        ing("Fine sea salt", 5, "g", "to taste", section="Seasoning"),
        ing("Black pepper, fresh cracked", "4-5", "turns", section="Seasoning"),
    ],
    method=[
        "Drain and crush: Colander-strain the tomatoes 2 minutes and discard the thin juice. Hand-crush into small, pulpy chunks. Do not blend.",
        "Bloom and sweat: Melt the butter with the oil over medium-low. Add the pepper flakes for 30 seconds, then the shallots, lemon peel and a pinch of salt; sweat 3–4 minutes without browning. Stir in the garlic for 45 seconds.",
        "Fry the paste: Work the tomato paste across the pan 2–3 minutes over medium until rich rust-red.",
        "Stage 1 deglaze: Add the stage 1 peach vodka, scrape the bottom and simmer hard 60–90 seconds until the ethanol steam clears.",
        "Simmer and cream: Add the tomatoes, salt and pepper. Simmer gently uncovered 10–12 minutes. Remove the lemon peel. On low, whisk in the cream slowly and simmer 2 minutes.",
        "Stage 2 finish: Off the heat, rest 60 seconds (below 175°F), then whisk in the stage 2 vodka and the Parmesan until glossy. Cool to room temperature.",
    ],
    notes="Two-stage spirit: stage 1 cooks into the base; stage 2 goes in off the heat to keep the peach aroma.\n"
          "Pairs with well-drained fior di latte or low-moisture mozzarella, torn speck or prosciutto cotto, and post-bake hot honey or rosemary. Deck 750–800°F, 60–90 seconds.",
    source="2026-10-02_Recipe_Peach_Vodka_Pizza_Sauce.pdf",
))

R.append(recipe(
    "k_sauce_basil_vodka", "Basil Vodka Pizza Sauce", "sauce", variant="Cold-butter emulsion",
    yield_qty="720", yield_unit="g", portion_9="45-50", portion_unit="g",
    bake_temp="Medium-low simmer", bake_time="25–30 min",
    holding="Chill completely before saucing; never sauce with warm sauce.",
    ingredients=[
        ing("San Marzano plum tomatoes", 1, "can (28 oz)", "milled or lightly pureed"),
        ing("Basil-infused vodka", 90, "mL"),
        ing("Unsalted butter — start (to brown)", 20, "g"),
        ing("Unsalted butter — finish (cold, cubed)", 35, "g"),
        ing("Yellow onion, peeled & halved (left whole)", 70, "g", "about ½ medium; discarded"),
        ing("Fine sea salt", 7.5, "g"),
        ing("Calabrian chili paste or flakes", 2, "g", "a pinch"),
        ing("Lemon peel, wide strip, no pith", 1, "strip", "discarded"),
    ],
    method=[
        "Mill and brown: Pass the tomatoes through a food mill or puree lightly. In a wide saucepan over medium, melt the starting butter until the foam subsides and the solids turn golden and nutty (about 2 minutes).",
        "Concentrate: Add the tomatoes, salt, chili and lemon peel; set the onion halves cut-side down in the center. Simmer on medium-low 25–30 minutes, stirring occasionally, until jammy and a spoon leaves a clean trail. Discard the onion and lemon peel.",
        "Flash-deglaze: Lower the heat and pour in the basil vodka all at once. Stir at a bare simmer 2–3 minutes at most. Do not boil hard.",
        "Mount the butter: Off the heat, stand 2 minutes (below 185°F), then whisk in the cold butter a piece at a time until glossy and fully emulsified.",
        "Chill: Transfer to a shallow container and chill completely before ladling.",
    ],
    notes="Cold butter instead of cream: cream sauces weep and separate above 700°F; the mounted butter clings without pooling. One 2-oz ladle per pie, leaving a ½-inch rim.",
    source="Basil_Vodka_Pizza_Sauce_28oz_White.pdf",
))

R.append(recipe(
    "k_sauce_cherry_bourbon", "Door County Cherry & Bourbon Red Sauce", "sauce",
    yield_qty="24", yield_unit="oz", portion_9="2", portion_unit="oz",
    bake_temp="Gentle simmer", bake_time="12–15 min",
    holding="Below 40°F — rapid chill in an ice bath or blast chiller.",
    ingredients=[
        ing("San Marzano tomatoes", 1, "can (28 oz)", "hand-crushed; pour off 3–4 tbsp of thin liquid"),
        ing("Door County tart cherry concentrate", 2, "tbsp", "100% unsweetened Montmorency"),
        ing("Sturgeon Spirits bourbon", 2, "fl oz", "deglaze and reduce by half"),
        ing("Honey or brown sugar", 1, "tsp"),
        ing("Unsalted butter", 2, "tbsp"),
        ing("Shallot, fine brunoise", 1, "large"),
        ing("Garlic, microplaned", 2, "clove"),
        ing("Double tomato paste", 1, "tbsp"),
        ing("Calabrian chili paste", 1, "tsp", "or chili flakes"),
        ing("Smoked sea salt", 1, "tsp", "adjust at the final taste"),
        ing("Black pepper", "1/2", "tsp"),
        ing("Fresh rosemary, bruised", 1, "sprig", "simmer whole; discard before chilling"),
    ],
    method=[
        "Aromatic bloom: Melt the butter in a heavy saucepan over medium-low. Sweat the shallot and garlic 2–3 minutes until glassy. Add the tomato paste and chili and cook 60 seconds until brick red.",
        "Bourbon reduction: Pull the pan off the burner, add the bourbon, then return to medium-high. Flame off or boil hard 90 seconds until the vapor bite is gone and it's reduced by half.",
        "Concentrate and tomatoes: Stir in the cherry concentrate, honey and tomatoes. Add the smoked salt, pepper and rosemary, scraping up all the fond.",
        "Simmer to coat: Simmer gently 12–15 minutes, stirring often, until it tightens into a clinging glaze that won't pool.",
        "Rapid chill: Remove the rosemary. Spread in a shallow hotel pan over an ice bath or into the blast chiller; cool below 40°F before service.",
    ],
    notes="Pizza Friday special. Single batch covers about 12 pies; the double (set Batches to 2) about 24. Flavor: oak char, malic tart and smoke.",
    source="2026-10-16_Recipe_Bourbon_Cherry_Pizza_Sauce_Prep.pdf",
))

R.append(recipe(
    "k_sauce_aperol_spritz", "Aperol & Fresh Tomato Spritz Sauce", "sauce", variant="No-cook",
    yield_qty="3.5", yield_unit="cups", bake_time="About 12 min prep",
    holding="Keep chilled until service.",
    ingredients=[
        ing("Fresh ripe tomatoes (plum, Roma or vine), cored & quartered", 3, "lb", "skins and seeds stay in", section="Fresh tomato base"),
        ing("Fine sea salt", "1.5", "tsp", section="Fresh tomato base"),
        ing("Ground black or white pepper", "1/4", "tsp", section="Fresh tomato base"),
        ing("Aperol", 4, "fl oz", section="Aperol spritz reduction"),
        ing("White wine vinegar (or white balsamic)", "1.5", "tbsp", section="Aperol spritz reduction"),
        ing("Extra virgin olive oil", "1.5", "tbsp", section="Aperol spritz reduction"),
        ing("Shallot, roughly minced", 1, "small", section="Aperol spritz reduction"),
        ing("Orange peel, wide strips, pith removed", 2, "strip", section="Aperol spritz reduction"),
    ],
    method=[
        "Pulse and drain: Pulse the tomatoes 4–6 times only, until coarsely chopped (running it foams the sauce pink). Pour into a colander or sieve over a bowl and let drain untouched 6–8 minutes.",
        "Aperol glaze: Warm the oil in a small saucepan over medium and sweat the shallot 60 seconds. Add the Aperol, vinegar and orange peel; boil and reduce by half (3–4 minutes) until glossy. Remove the peel.",
        "Combine: Scrape the warm syrup into the drained pulp and whisk in the salt and pepper until the oil emulsifies into the tomato.",
    ],
    notes="The sheet portions about ⅓ cup per 12-inch pie and says 6–8 pies per batch; it gives no 9-inch portion yet.",
    source="Aperol Fresh Tomato Pizza Sauce.pdf",
))

# ---------------------------------------------------------------- bases
R.append(recipe(
    "k_base_garlic_butter", "Garlic Butter Pizza Base", "base",
    yield_qty="1.5", yield_unit="cups", portion_9="24", portion_unit="g",
    bake_temp="Very low heat", bake_time="About 2 min (the garlic must not color)",
    holding="Stir before every use. Keep a small working amount at the station; hold hot or refrigerated per food-safety procedure.",
    ingredients=[
        ing("Unsalted butter", "1 3/4", "sticks"),
        ing("Extra virgin olive oil", 7, "tbsp"),
        ing("Garlic, finely minced", "12-14", "clove"),
        ing("Fresh oregano leaves, finely chopped", 2, "tbsp"),
        ing("Fresh parsley, finely chopped", "1/4", "cup"),
        ing("Fine sea salt", "3/4", "tsp"),
        ing("Crushed red pepper flakes", "3/4", "tsp", "optional"),
    ],
    method=[
        "Prepare: Mince the garlic; chop the oregano and parsley and keep them separate.",
        "Melt: Melt the butter with the oil over low heat. Do not brown.",
        "Cook the garlic: Add the garlic and cook over very low heat about 2 minutes, stirring, until fragrant and soft. Pull it before it turns golden.",
        "Season: Off heat, stir in the oregano, parsley, salt and pepper flakes. Rest 5 minutes to infuse.",
        "Portion: Stir well and spread about 24 g (1.4 tbsp) on each 9-inch skin, keeping the garlic and herbs under the cheese and toppings.",
    ],
    notes="15 pies × 24 g ≈ 360 g used, with allowance for the container and service loss.\n"
          "At 800°F, don't brush the bare rim with the garlic-herb mix before baking — it scorches. Brush the rim with plain olive oil before, or with garlic butter right after the bake.",
    source="Sturgeon_Spirits_Garlic_Butter_Pizza_Base.pdf",
))

R.append(recipe(
    "k_base_bourbon_sage", "Bourbon-Sage Brown Butter Base", "base",
    yield_qty="5-6", yield_unit="pies", portion_9="2-2.5", portion_unit="tbsp",
    bake_temp="Medium, then medium-low", bake_time="About 2 min simmer at the end",
    holding="Cool; spread at room temperature.",
    ingredients=[
        ing("Unsalted butter", 2, "sticks"),
        ing("Fresh sage, chiffonade", "1/4", "cup"),
        ing("Shallots, minced fine", 2, "medium"),
        ing("Garlic, grated", 3, "clove"),
        ing("00 or AP flour", 2, "tbsp"),
        ing("Bourbon", 2, "fl oz"),
        ing("Garlic vodka", "0.5", "fl oz"),
        ing("Chicken stock, warm", "3/4", "cup"),
        ing("Pecorino or Parmesan, grated", "1/3", "cup"),
        ing("Black pepper", 1, "tsp"),
        ing("Salt", "1/2", "tsp"),
    ],
    method=[
        "Brown butter and sage: Melt the butter over medium. When the foam subsides and the solids turn golden-brown, add the shallots and sage; swirl 60–90 seconds until nutty.",
        "Roux: Whisk in the garlic and flour and cook 60 seconds, whisking, so the flour absorbs the fat (this keeps the oil from separating in the 800°F oven).",
        "Deglaze: Pull the pan off the heat, add the bourbon and garlic vodka, return to medium-low and whisk 30–45 seconds into a thick paste as the alcohol cooks off.",
        "Emulsify: Drizzle in the warm stock, whisking, until smooth and glossy. Simmer 2 minutes to a light gravy. Off heat, whisk in the cheese, pepper and salt. Cool.",
    ],
    notes="Base for the Bourbon-Sage Chicken & Jalapeño pizza.",
    source="bourbon_sage_chicken_pizza_prep_sheet.pdf",
))

# ---------------------------------------------------------------- toppings
R.append(recipe(
    "k_topping_chicken_thighs", "Smoky Garlic-Pepper Chicken Thighs", "topping",
    yield_qty="5-6", yield_unit="pies", bake_temp="Smoking-hot cast iron", bake_time="4–5 min + 3 min, to 170°F internal",
    ingredients=[
        ing("Boneless chicken thighs", "1.5", "lb", "trim the heavy fat caps"),
        ing("Olive oil", 1, "tbsp"),
        ing("Kosher salt", "1.5", "tsp"),
        ing("Coarse black pepper", 1, "tsp"),
        ing("Smoked paprika", 1, "tsp"),
        ing("Garlic powder", 1, "tsp"),
        ing("Onion powder", "1/2", "tsp"),
        ing("Dried thyme", "1/2", "tsp"),
        ing("Bourbon (deglaze)", 1, "fl oz"),
        ing("Lemon (juice)", "1/2", "lemon"),
    ],
    method=[
        "Trim and rub: Snip the heavy fat caps off the thigh edges. Toss with the oil and the spice blend for an even coat.",
        "Hard sear: Heat a cast-iron skillet until smoking. Sear smooth-side down 4–5 minutes until deeply browned, then flip for 3 minutes to 170°F internal.",
        "Deglaze and slice: Rest the thighs 5 minutes. Add the bourbon and lemon juice to the hot pan to lift the fond. Slice the thighs ½ inch and toss in the reduced pan juices.",
    ],
    source="bourbon_sage_chicken_pizza_prep_sheet.pdf",
))

R.append(recipe(
    "k_finish_hot_honey", "Hot Honey", "finish",
    yield_qty="1", yield_unit="cup", bake_temp="Bare simmer (150–160°F)", bake_time="Steep 5–10 min",
    holding="Strained (dried flakes only): sealed jar at room temperature, up to 3 months. With fresh chili left in: refrigerate, up to 1 month.",
    ingredients=[
        ing("Pure honey (clover, wildflower or orange blossom)", 1, "cup"),
        ing("Crushed red pepper flakes", 1, "tbsp", "adjust to taste"),
        ing("Fresh red chili (Fresno or jalapeño), thinly sliced", 1, "each", "optional"),
        ing("Apple cider vinegar", 1, "tbsp"),
        ing("Fine sea salt", "pinch", ""),
    ],
    method=[
        "Combine and heat: Honey, pepper flakes and fresh chili (if using) in a small heavy saucepan over medium-low.",
        "Gently simmer: Bring to a bare simmer (150–160°F), just tiny bubbles at the edge. Don't boil — it scorches the honey.",
        "Infuse: Lower the heat and steep 5–10 minutes. Taste at 5 minutes.",
        "Brighten: Off heat, stir in the vinegar and salt.",
        "Strain or jar: Strain through a fine sieve for a clear finish, or leave the flakes in for more heat over time.",
        "Cool and seal: Cool to room temperature before lidding.",
    ],
    notes="Bourbon cask finish: stir in 1 tsp high-proof bourbon right off the heat.\n"
          "Smoky chipotle: swap half the flakes for crushed chipotle, or add ¼ tsp smoked paprika.\n"
          "Cocktail syrup: equal parts hot honey and warm water.",
    source="hot honey recipe.pdf",
))

# ---------------------------------------------------------------- pizza builds
def layer(layer_id, item="", amount_9="", amount_14="", unit="", notes="", component_id=""):
    return {"layer": layer_id, "component_id": component_id, "item": item, "amount_9": str(amount_9),
            "amount_14": str(amount_14), "unit": unit, "notes": notes}


def build(build_id, name, description, layers, bake_notes="", notes="", sizes="9,14"):
    return {"build_id": build_id, "name": name, "status": "idea", "sizes": sizes,
            "dough_9": FRIDAY, "dough_14": PACKERS, "description": description,
            "bake_notes": bake_notes, "notes": notes, "layers": layers}


B = [
    build("p_peninsula_pine", "The Peninsula & Pine",
          "Door County cherry & bourbon sauce, smoked provolone, pancetta, pickled red onion and rosemary, finished with hot honey.",
          [layer("base", component_id="k_sauce_cherry_bourbon", notes="chilled"),
           layer("cheese", "Low-moisture mozzarella", "1.75", unit="oz"),
           layer("cheese", "Smoked provolone or fontina", "1", unit="oz"),
           layer("topping", "Pancetta, par-rendered 50%", "1.25", unit="oz"),
           layer("topping", "Pickled red onions"),
           layer("topping", "Fresh rosemary needles", "10-12", unit="needles"),
           layer("finish", component_id="k_finish_hot_honey", notes="drizzle"),
           layer("finish", "Aged Wisconsin cheese, microplaned", notes="the sheet's text is cut off here — confirm which cheese")],
          bake_notes="Hot deck, 700–800°F.",
          notes="From the Door County Cherry & Bourbon station sheet (Chef Gus station spec)."),
    build("p_bourbon_sage_chicken", "Bourbon-Sage Chicken & Jalapeño",
          "Bourbon-sage brown butter base, mozzarella, pan-glazed chicken thigh and jalapeño, arugula and hot honey.",
          [layer("base", component_id="k_base_bourbon_sage", amount_9="2-2.5", unit="tbsp", notes="room temperature; leave a clean rim"),
           layer("cheese", "Low-moisture mozzarella, shredded", notes="optional: aged provolone or white cheddar"),
           layer("topping", component_id="k_topping_chicken_thighs", notes="on top of the cheese so the edges caramelize"),
           layer("topping", "Fresh jalapeño, thin rounds"),
           layer("finish", "Baby arugula", notes="tossed in lemon juice, olive oil and flaky salt"),
           layer("finish", component_id="k_finish_hot_honey", notes="zigzag over the greens and rim")],
          bake_notes="800°F deck until the crust blisters, the cheese bubbles golden and the jalapeño edges char."),
    build("p_distillers_margherita", "Distiller's Margherita",
          "Basil vodka sauce, fior di latte, cherry tomatoes, torn basil and Pecorino.",
          [layer("base", component_id="k_sauce_basil_vodka"),
           layer("cheese", "Fior di latte, pressed dry", "50", unit="g"),
           layer("topping", "Cherry tomatoes, halved", notes="skin-side down"),
           layer("finish", "Torn basil leaves"),
           layer("finish", "Pecorino Romano", notes="a heavy snow"),
           layer("finish", "Extra virgin olive oil")],
          notes="Suggested on the Basil Vodka sauce sheet."),
    build("p_pancetta_hot_honey", "Pancetta & Hot Honey",
          "Basil vodka sauce, mozzarella, shaved pancetta and shallots, Calabrian hot honey.",
          [layer("base", component_id="k_sauce_basil_vodka"),
           layer("cheese", "Low-moisture mozzarella", "55", unit="g"),
           layer("topping", "Pancetta, shaved", "35", unit="g"),
           layer("topping", "Shallots, shaved"),
           layer("finish", "Calabrian hot honey"),
           layer("finish", "Parmigiano-Reggiano, shaved")],
          notes="Suggested on the Basil Vodka sauce sheet."),
    build("p_fennel_castelvetrano", "Fennel Sausage & Castelvetrano",
          "Basil vodka sauce, mozzarella and provolone, fennel sausage, Castelvetrano olives, fennel fronds.",
          [layer("base", component_id="k_sauce_basil_vodka"),
           layer("cheese", "Mozzarella", "50", unit="g"),
           layer("cheese", "Mild provolone", "15", unit="g"),
           layer("topping", "Raw fennel sausage", "40", unit="g", notes="dime-sized pinches"),
           layer("topping", "Castelvetrano olives, torn", "20", unit="g"),
           layer("finish", "Fennel fronds")],
          notes="Suggested on the Basil Vodka sauce sheet."),
    build("p_cup_char_stracciatella", "Cup & Char Pepperoni + Stracciatella",
          "Basil vodka sauce, mozzarella, cupping pepperoni, cold stracciatella.",
          [layer("base", component_id="k_sauce_basil_vodka"),
           layer("cheese", "Mozzarella", "45", unit="g"),
           layer("topping", "Cupping pepperoni", "35", unit="g"),
           layer("finish", "Cold stracciatella or burrata", notes="dollops"),
           layer("finish", "Cracked black pepper")],
          notes="Suggested on the Basil Vodka sauce sheet."),
    build("p_aperol_prosciutto", "Aperol Spritz & Prosciutto",
          "Aperol fresh tomato sauce, fresh mozzarella, prosciutto crudo draped after the bake.",
          [layer("base", component_id="k_sauce_aperol_spritz", notes="the sheet uses about ⅓ cup on a 12-inch pie"),
           layer("cheese", "Fresh mozzarella, torn and dried"),
           layer("cheese", "Parmigiano-Reggiano, finely grated", notes="a light dusting"),
           layer("finish", "Prosciutto crudo ribbons", notes="drape right out of the oven — never bake it"),
           layer("finish", "Parmigiano-Reggiano curls")],
          bake_notes="Bake the crust and cheese only, until the mozzarella bubbles and the crust blisters."),
    build("p_smoky_bourbon_chorizo", "Smoky Bourbon Chorizo",
          "Smoky bourbon tomato sauce, smoked mozzarella, chorizo and caramelized onion, fresh thyme.",
          [layer("base", component_id="k_sauce_smoky_bourbon_canned", notes="a thin layer"),
           layer("cheese", "Smoked mozzarella, shredded", amount_14="8", unit="oz"),
           layer("topping", "Caramelized yellow onion", notes="1 large onion per 14-inch pie, sliced thin and caramelized"),
           layer("topping", "Spicy Spanish chorizo, sliced thin", amount_14="4", unit="oz"),
           layer("finish", "Fresh thyme leaves")],
          notes="From a dishgen.com home-oven recipe for one 14-inch pie; the 9-inch amounts are scaled down by area."),
]

out = {"note": "Starter kitchen recipes transcribed from the printed PDFs, 2026-11-02. Imported once from kitchen.html.",
       "recipes": R, "builds": B}
path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "kitchen_seed.json")
with open(path, "w") as fh:
    json.dump(out, fh, indent=1, ensure_ascii=False)
print(f"wrote {path}: {len(R)} recipes, {len(B)} builds")
