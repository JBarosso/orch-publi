# Capture programmations Salesforce → orch-publi

Extension Chrome qui capture les programmations (locales + dates) définies dans
la popin "Targeting" du Page Designer Salesforce, pour les importer ensuite
dans le dashboard orch-publi (page Programmation) sans double saisie.

## Installation

1. Dézippez le fichier.
2. Chrome → `chrome://extensions`
3. Activez le **Mode développeur** (en haut à droite).
4. **Charger l'extension non empaquetée** → sélectionnez le dossier dézippé.
5. Épinglez l'icône dans la barre d'outils si besoin. Un clic dessus ouvre le
   panneau latéral.

## Utilisation

- Le toggle en haut du panneau active/désactive la capture (activée par
  défaut). Le panneau n'a pas besoin d'être ouvert pour capturer — la
  capture se fait en tâche de fond.
- Sur Salesforce, remplissez la popin **Targeting** (locales, Display
  From/To) puis cliquez **Apply** : une carte apparaît dans le panneau.
- Bouton **🧹 Clean** : vide toutes les cartes enregistrées.
- Croix sur une carte : supprime uniquement celle-ci.
- Depuis le dashboard orch-publi (page Programmation), le bouton **Importer
  depuis l'extension** récupère toutes les cartes, crée les blocs
  correspondants, puis vide automatiquement l'extension si l'import réussit.

## Domaines couverts

Actuellement scopé sur l'environnement de staging :
- `staging-store-orchestra.demandware.net` (Business Manager)
- `fr.staging-orchestra.fr` (iframe de rendu du Page Designer)

Pour ajouter la prod, éditez `matches` dans `manifest.json`
(`content_scripts` et `host_permissions`) avec les domaines équivalents.

## Pourquoi un ID d'extension fixe

Le champ `key` dans `manifest.json` fige l'ID de l'extension
(`mmflbabaopfdnobammoejjfodcfgjlle`) quel que soit qui la charge — sans ça,
chaque installation "Load unpacked" génère un ID aléatoire différent, et le
dashboard ne pourrait pas savoir à qui envoyer les messages d'import. Ne
modifiez pas ce champ.
