1. **HTML Additions (`index.html`)**:
   - Sidebar Tabs: Add "Monstros" and "Mesa RPG".
   - Modals: 
     - `modal-monster`: form to create a monster (Name, Avatar, Base HP, Base Stamina, Max Lust, Attacks description, etc).
     - `modal-combat-add`: form to add combatants to the tracker.
   - Main Views: 
     - `rpg-dashboard-container`: The Combat Tracker. Shows a list of cards (Combatants). Each card has HP, ST, LUST bars, quick buttons to `+` or `-` values, and an "End Turn" button. It tracks Initiative.

2. **JS Additions (`app.js`)**:
   - Arrays: `let monsters = [];`, `let combatState = { turn: 0, combatants: [] };`
   - `saveToDB` for `monsters`.
   - Sidebar rendering for `currentTab === 'monsters'`.
   - Sidebar rendering for `currentTab === 'rpg'`.
   - `renderRPG()` function to draw the Combat Tracker.
   - Logic to roll initiative, sort combatants, next turn.
