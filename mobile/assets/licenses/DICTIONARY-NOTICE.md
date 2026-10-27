# Bundled Vietnamese–English dictionary

Data attribution: Wiktionary contributors, extracted by Tatu Ylonen and the
Wiktextract / Kaikki.org project. Licensed under CC BY-SA 4.0:
https://creativecommons.org/licenses/by-sa/4.0/
Full license: CC-BY-SA-4.0.txt in this directory.

Source: https://kaikki.org/dictionary/Vietnamese/index.html
Download: https://kaikki.org/dictionary/Vietnamese/kaikki.org-dictionary-Vietnamese.jsonl
English Wiktionary dump: 2026-09-02; retrieval: 2026-10-21.
Source SHA-256: ba64fae8301bf3f383a82bb178f2370309d31b3bcb3a92e9b0c9e04aeb6ecc16

Each row in src/features/translate/data/dictionary-vi-en.json is
[Vietnamese headword, English gloss, part of speech]. The Vietnamese headword
identifies the source page and its contributor history:
https://en.wiktionary.org/wiki/<URL-encoded-headword>#Vietnamese
History: https://en.wiktionary.org/w/index.php?title=<URL-encoded-headword>&action=history
The app links these pages from dictionary results.

BeTravel modifications: selected short, unlabelled glosses of Latin-script
headwords, excluded inflections/alternative forms and explanatory glosses,
split semicolon-separated synonyms, removed infinitive "to" for verbs,
normalized Unicode NFC, deduplicated pairs and built a reverse lookup index.
The derived dictionary data remains CC BY-SA 4.0. No endorsement is implied.
Rebuild script: mobile/scripts/build-bundled-dictionary.cjs.
Community definitions are not certified translations; meanings require context.

The 42 core travel word pairs and 88 new travel phrases are authored for BeTravel, separate from this corpus.
The existing 10 Tatoeba pairs retain their CC BY 2.0 FR attribution and source
sentence IDs in src/features/translate/vi-en.json; see docs/TRANSLATION.md.
