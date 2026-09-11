# Zalgo MUX · 3.0.0

Zalgo MUX v3 is the two-independent-channel format specified on 2026-09-10. The historical overlay-as-key experiment and v1/v2 pages retain their own formats and source files.

## Exact domain and meanings

The carrier is any nonempty well-formed Unicode string, up to 20,000 UTF-16 code units. Both payloads accept well-formed Unicode, including case, whitespace, NUL and U+FEFF, up to 65,536 UTF-8 bytes each. Unpaired surrogates are rejected. No input or output is normalized.

Font selection happens before MUX encoding. The exact carrier is the selected font generator's output, not its unstyled input. This distinction matters for case-folding, mirrored, symbolic and decorative generators. In plain mode the input itself is the exact carrier.

Each lane validates independently. `decodeLane(text, 'a')` does not parse B tokens or require B's header, checksum or payload; B has the symmetric contract. The UI reports each as exact, absent or rejected. The carrier has its own exact / changed / unverified / rejected outcome. A corrupted lane must never suppress a valid result from the other lane.

“Exact” means consistent with the frame and CRC32, not authenticated. CRC32 is accidental-error detection and is forgeable. This is not encryption.

## Tokens and alphabets

Every digit is a two-code-point token: lane guard followed by that lane's digit mark.

| Digit | A above / below aliases | B overlay |
| --- | --- | --- |
| 0 | U+030D / U+0329 | U+20DD |
| 1 | U+0357 / U+0339 | U+20DE |
| 2 | U+033F / U+0333 | U+0489 |
| 3 | U+030A / U+0325 | U+20E4 |
| 4 | U+035D / U+035C | U+0488 |
| 5 | U+030E / U+0348 | U+0338 |
| 6 | U+033D / U+0353 | U+20E5 |
| 7 | U+0346 / U+032A | U+20D2 |
| 8 | U+0311 / U+032F | U+20EA |
| 9 | U+0306 / U+032E | U+20EB |

A guard: U+034F COMBINING GRAPHEME JOINER. B guard: U+FE0E VARIATION SELECTOR-15. Both are combining characters with canonical combining class zero; this new structural use keeps digits within the carrier's grapheme while preventing canonical reordering across token boundaries. It also prevents ordinary unguarded carrier diacritics from being treated as payload. A digits alternate above/below aliases by one-based A-stream position (odd above, even below). Either alias decodes to the same digit. B uses the listed overlay only. A variation selector can influence font presentation; exact pixels are not part of the protocol. A receiver that drops variation selectors will reject B.

Carrier occurrences of either guard, and of U+2063 INVISIBLE SEPARATOR, are escaped by doubling the code point. The parser consumes a doubled guard as one literal carrier character; it never counts that pair as payload. Other original marks, emoji components, variation selectors, non-Latin scripts and symbols are preserved literally. It is not necessary to strip existing decoration.

U+2063 followed by U+25CC DOTTED CIRCLE denotes one generated continuation carrier. It is removed when restoring the original carrier. An original U+2063 is doubled first, so the same literal pair in the source remains recoverable.

An unmatched guard, guard followed by an unknown digit mark, or malformed continuation is rejected by the parser responsible for it. A lane parser ignores the other lane's guards and marks. Shared whole-container validity is not a prerequisite for independent lane recovery.

## One independently framed digit stream per lane

```text
03                 version, two decimal digits
1 or 2             lane identity (A=1, B=2)
LLLLLL             payload UTF-8 byte length, exactly six decimal digits
CCCCCCCCCC         payload CRC32, exactly ten decimal digits
RRRRRRRRRR         original carrier UTF-8 CRC32, exactly ten decimal digits
BBB BBB …          each payload byte as three decimal digits, 000 through 255
```

No separators occur in the actual digit stream. Header length is 29 digits. Empty payloads still emit a full frame, including the CRC32 of an empty byte array (zero).

CRC32 is the reflected IEEE polynomial 0xEDB88320, initial 0xFFFFFFFF, final XOR 0xFFFFFFFF. All stored checksums are unsigned decimal numbers no greater than 4,294,967,295. Decode exactly `29 + 3 * L` digits; reject truncation, extra digits, concatenated frames, invalid byte values, invalid UTF-8, wrong lane/version, length limits and checksum mismatches. Do not salvage a prefix or guess missing characters.

The carrier checksum is duplicated in each lane so carrier verification can succeed with just one intact lane. If both intact frames disagree about it, the carrier status is changed. Payload results remain independent of carrier status. CRC checks accidental corruption; author authentication requires a separate signature or MAC.

## Placement and transport units

Segment the source with `Intl.Segmenter('en', {granularity:'grapheme'})`, then escape each source cluster independently. Starting with A, alternate available A/B digit tokens while filling each unit to at most 20 code points. Each two-code-point token consumes two places. When one lane is exhausted, fill from the other. Payload-free source suffixes remain literal.

After all source units, append as many U+2063/U+25CC continuation units as necessary and fill them by the same rule. Existing source units longer than 20 code points receive no new tokens; they remain unchanged after escaping and are counted in the receipt. The decoder recovers by token order and does not depend on reproducing the encoder's grapheme segmentation.

The encoder budgets each generated unit to 20 code points, following the recovered transport model. Decode the exact text returned by a destination: removing guards or payload marks changes the frame and is detected rather than repaired. The regression suite exercises this unit budget and normalization behavior.

## Font catalog and history

`font-garden.js` is an extracted pure catalog from the recovered Veil-Script Font Garden 0.2.1 (50 registers). `register-recipes.js` adds the two missing mathematical italic families, 23 executable interpretations of the recovered synthetic-register descriptions, the recovered Kaomoji Heart/Combining Box ideas and a literal Coral Asemic specimen: 78 choices. Arbitrary custom Unicode works in plain mode.

The current v3 workshop remembers only a validated catalog ID in browser local storage (`ashwood:zalgo-mux3:register:v1`). Selecting Plain remembers custom-carrier mode, not the custom text. Carrier contents, both messages, encoded output and decoder input are not persisted by the app. Unknown IDs or unavailable storage fall back to the default register; encoding remains usable without storage.

Current-v3 catalog correction, 2026-09-10: Mirror Room and Upside Down reverse grapheme clusters and substitute only each cluster's first code point. Combining marks, emoji modifiers, ZWJ sequences, regional-indicator pairs and keycaps keep their internal order. Orientation requires `Intl.Segmenter`; if unavailable, these two styles return the input unchanged instead of splitting its clusters. The MUX encoder itself requires a supported grapheme-segmenting runtime. This catalog repair preserves the wire format and the separate historical v1/v2 artifacts.

Coral Asemic presents a fixed literal specimen; arbitrary-text translation would require its token dictionary. The synthetic register examples live in Font Garden alongside the implementation's explicit indexing rules.

`historical/overlay-key-prototype.py` is a separate recovered prototype: overlay digits encode an ASCII-derived key, which is repeated modulo ten against the primary digit stream. Its old header calls itself “v3,” but it is not this independent MUX format. It is not modern encryption. Neither the complete original `whispers` specimen nor Aureole-MUX tables have been recovered here.

## Validation

Run `python3 tests/run.py` with Google Chrome, or set `CHROME_BIN` to another compatible executable. Tests use an isolated profile and local HTTP server. The suite verifies all 78 carriers, grapheme-safe orientation, font/custom-mode reload preferences without message storage, unknown/disabled storage, exact Unicode and escape recovery, removal/corruption isolation, malformed frames, canonical/compatibility normalization behavior, a modeled 20-code-point cap, and real-browser v1/v2 round trips.

The browser suite exercises MUX v3 and the actual legacy pages. The earlier `transport-boundaries.test.mjs` targets a different source layout; its source-pattern assertions are separate from this runnable suite.
# Evening evidence update · 2026-09-10

The later supplied Kasaneuta recovery README reports that the original Aureole-MUX exchange and Halo-8, Root-8, Ghost-5 and Orbital-3 tables were recovered elsewhere, with Loop·Weave, Orbital·Wrap, Covert·Drift and Time-Division MUX variants. It does **not** include the actual four tables or its referenced `AUREOLE_MUX_EXACT_RECOVERY.md`/raw UI capture in this checkout. The gap is now “referenced recovery packet not supplied,” not “no recovery reported anywhere.”

Do not infer those tables from their sizes or relabel the independently specified MUX3 format below as the historical Aureole-MUX. The source-reported table/variant naming and attribution can be reconciled when the full packet arrives. The exact supplied report is preserved privately in the workspace-context evening intake.
