import db from "../src/lib/db";

const OFFICE_PROJECT_ID = "85ab0f81-65ab-4bab-85dd-82c050359cb2";

const newExplanation = `Welcome to your new executive workspace—a serene sanctuary thoughtfully crafted around the principles of refined minimalism. Designed to cultivate absolute focus and quiet inspiration within your 14-square-meter office, this concept strips away visual clutter in favor of intentional elegance. The result is a high-end, uncluttered environment that delivers maximum aesthetic impact while remaining exceptionally cost-effective.

At the heart of the layout, the Swann Study Desk serves as a sleek, modern workstation defined by its clean architectural lines. It pairs effortlessly with the Supreme Chest of Drawers in French Sonoma Oak, which offers generous storage to keep paperwork and supplies neatly concealed. A white Jeffcoco chair with wooden legs and a leather-cushion seat completes the workstation, adding a bright, airy accent that echoes the desk's pearl-white finish. Together, these core pieces establish a balanced synergy of form and utility, ensuring your workspace remains beautifully organized and free of distractions.

The color palette embraces a comforting harmony of natural summer oak, French Sonoma oak, pearl white, and soft white, all grounded by the tactile texture of the contemporary white Amber rug. Subtle metallic details and smoked glass introduce a touch of understated luxury, illuminated by a layered lighting ensemble. The versatile Urban LED pendant overhead, complemented by the warm gold floor lamp and geometric globe desk light, allows you to effortlessly tailor the mood from focused task work to ambient evening ideation.

Thoughtfully scaled for the room's dimensions, each piece honors the space by keeping sightlines clear and preserving open floor area. By prioritizing vertical storage and slender, leggy silhouettes, the design optimizes natural light flow and transforms your office into an expansive, highly efficient haven where calm meets daily productivity.`;

db.prepare(
  "UPDATE design_projects SET design_explanation = ?, updated_at = datetime('now') WHERE id = ?"
).run(newExplanation, OFFICE_PROJECT_ID);

console.log("Updated office design explanation for white chair");
