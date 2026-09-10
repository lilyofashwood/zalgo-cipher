#!/usr/bin/env python3
"""
Zalgo Cipher v3 — Overlay Key Extension
by Lily of Ashwood, 2026

Extends the published Zalgo Cipher (v1/v2) with a Vigenère encryption layer.
The overlay diacritics (already in v2's table but never connected) carry the
encryption key. The standard combining marks carry the Vigenère-encrypted message.

Two-layer encryption:
  1. Hidden message → ASCII decimal digits
  2. Vigenère-encrypt those digits using the key (mod 10 on each digit)
  3. Encode encrypted digits as combining diacritics on carrier text
  4. Encode key as overlay diacritics scattered across the carrier

Decryption:
  1. Extract overlay marks → recover key
  2. Extract combining marks → recover Vigenère-encrypted digits
  3. Vigenère-decrypt with key → original ASCII digits
  4. Parse digits back to plaintext

The overlay table exists in the shipped v2 tool but was never wired to anything.
This is what it was built for.
"""

# ═══════════════════════════════════════════
# Cipher tables (from shipped v2)
# ═══════════════════════════════════════════

# Standard combining marks for message digits (top/bottom pairs)
CIPHER = {
    '0': ['\u030D', '\u0329'],  # combining vertical line above / below
    '1': ['\u0357', '\u0339'],  # combining right half ring above / below
    '2': ['\u033F', '\u0333'],  # combining double overline / underline
    '3': ['\u030A', '\u0325'],  # combining ring above / below
    '4': ['\u035D', '\u035C'],  # combining double breve / inverted breve below
    '5': ['\u030E', '\u0348'],  # combining double vertical line above / below
    '6': ['\u033D', '\u0353'],  # combining x above / x below
    '7': ['\u0346', '\u032A'],  # combining bridge above / bridge below
    '8': ['\u0311', '\u032F'],  # combining inverted breve / below
    '9': ['\u0306', '\u032E'],  # combining breve / below
}

# Overlay diacritics for key digits
OVERLAY = [
    '\u20DD',  # 0 → combining enclosing circle
    '\u20DE',  # 1 → combining enclosing square
    '\u0489',  # 2 → combining cyrillic millions sign
    '\u20E4',  # 3 → combining enclosing upward pointing triangle
    '\u0488',  # 4 → combining cyrillic hundred thousands sign
    '\u0338',  # 5 → combining long solidus overlay
    '\u20E5',  # 6 → combining reverse solidus overlay
    '\u20D2',  # 7 → combining long vertical line overlay
    '\u20EA',  # 8 → combining leftwards arrow overlay
    '\u20EB',  # 9 → combining long double solidus overlay
]

OVERLAY_REV = {c: str(i) for i, c in enumerate(OVERLAY)}
CGJ = '\u034F'  # combining grapheme joiner (separator)

# Reverse lookup for combining marks
CIPHER_REV = {}
for digit, marks in CIPHER.items():
    for mark in marks:
        CIPHER_REV[mark] = digit


# ═══════════════════════════════════════════
# Vigenère on digits (mod 10)
# ═══════════════════════════════════════════

def vigenere_encrypt_digits(digit_string, key_string):
    """Vigenère-encrypt ASCII digit string using key's ASCII digits, mod 10."""
    key_digits = ''.join(str(ord(c)) for c in key_string)
    result = []
    for i, d in enumerate(digit_string):
        k = int(key_digits[i % len(key_digits)])
        result.append(str((int(d) + k) % 10))
    return ''.join(result)

def vigenere_decrypt_digits(encrypted_digits, key_string):
    """Vigenère-decrypt ASCII digit string."""
    key_digits = ''.join(str(ord(c)) for c in key_string)
    result = []
    for i, d in enumerate(encrypted_digits):
        k = int(key_digits[i % len(key_digits)])
        result.append(str((int(d) - k) % 10))
    return ''.join(result)


# ═══════════════════════════════════════════
# Encoder
# ═══════════════════════════════════════════

def encode(carrier, message, key):
    """
    Encode message into carrier text with overlay key.

    Args:
        carrier: visible text (the poem, the sentence)
        message: hidden message to encrypt
        key: encryption key (short string)

    Returns:
        encoded string with combining marks (message) and overlays (key)
    """
    # Step 1: message → ASCII decimal digits
    msg_digits = ''.join(str(ord(c)) for c in message)

    # Step 2: key → ASCII decimal digits for overlay
    key_digits = ''.join(str(ord(c)) for c in key)

    # Step 3: Vigenère-encrypt message digits with key
    encrypted_digits = vigenere_encrypt_digits(msg_digits, key)

    # Step 4: find carrier letter positions
    carrier_letters = [(i, c) for i, c in enumerate(carrier) if c.isalpha()]

    if len(carrier_letters) < max(len(encrypted_digits), len(key_digits)):
        raise ValueError(
            f"Carrier too short: need {max(len(encrypted_digits), len(key_digits))} "
            f"letters, have {len(carrier_letters)}"
        )

    # Step 5: attach combining marks (encrypted message) to carrier letters
    result = list(carrier)
    for j, digit in enumerate(encrypted_digits):
        if j < len(carrier_letters):
            idx = carrier_letters[j][0]
            mark = CIPHER[digit][j % 2]  # alternate top/bottom
            result[idx] = result[idx] + mark

    # Step 6: attach overlay marks (key digits) scattered across carrier
    # Place key overlays on letters AFTER the message marks
    key_start = 0  # overlay key starts at beginning of carrier
    for j, digit in enumerate(key_digits):
        if key_start + j < len(carrier_letters):
            idx = carrier_letters[key_start + j][0]
            overlay = OVERLAY[int(digit)]
            result[idx] = result[idx] + overlay

    return ''.join(result)


# ═══════════════════════════════════════════
# Decoder
# ═══════════════════════════════════════════

def decode(encoded_text):
    """
    Decode an overlay-keyed zalgo text.

    Returns:
        dict with 'message', 'key', 'encrypted_digits', 'carrier'
    """
    # Step 1: extract overlay marks → key digits
    key_digits = []
    combining_digits = []
    carrier_chars = []

    for c in encoded_text:
        if c in OVERLAY_REV:
            key_digits.append(OVERLAY_REV[c])
        elif c in CIPHER_REV:
            combining_digits.append(CIPHER_REV[c])
        elif c != CGJ:
            carrier_chars.append(c)

    encrypted_digit_str = ''.join(combining_digits)
    key_digit_str = ''.join(key_digits)

    # Step 2: reconstruct key from key digits
    # key digits are ASCII decimal of key chars, concatenated
    # We need to parse them back into characters
    key = _digits_to_text(key_digit_str)

    # Step 3: Vigenère-decrypt message digits
    if key and encrypted_digit_str:
        decrypted_digits = vigenere_decrypt_digits(encrypted_digit_str, key)
        message = _digits_to_text(decrypted_digits)
    else:
        decrypted_digits = encrypted_digit_str
        message = ""

    return {
        "message": message,
        "key": key,
        "encrypted_digits": encrypted_digit_str,
        "carrier": ''.join(carrier_chars),
    }


def _digits_to_text(digit_string):
    """Parse concatenated ASCII decimal digits back into text."""
    result = []
    i = 0
    while i < len(digit_string):
        # Try 3-digit ASCII (100-127 for common chars)
        if i + 2 < len(digit_string):
            val3 = int(digit_string[i:i+3])
            if 32 <= val3 <= 126:
                # Check if 2-digit also valid and which makes more sense
                val2 = int(digit_string[i:i+2])
                if 32 <= val2 <= 99:
                    # Ambiguous — prefer 2-digit for space (32), prefer 3-digit for letters
                    if 97 <= val3 <= 122 or 65 <= val3 <= 90:  # lowercase or uppercase letter
                        result.append(chr(val3))
                        i += 3
                        continue
                    else:
                        result.append(chr(val2))
                        i += 2
                        continue
                result.append(chr(val3))
                i += 3
                continue
        if i + 1 < len(digit_string):
            val2 = int(digit_string[i:i+2])
            if 32 <= val2 <= 99:
                result.append(chr(val2))
                i += 2
                continue
        i += 1  # skip unparseable digit
    return ''.join(result)


# ═══════════════════════════════════════════
# Demo
# ═══════════════════════════════════════════

if __name__ == "__main__":
    print("🔮 Zalgo v3 — Overlay Key Cipher")
    print("=" * 50)

    carrier = "whispers in the dark between the stars"
    message = "lily"
    key = "nya"

    print(f"  Carrier : {carrier}")
    print(f"  Message : {message}")
    print(f"  Key     : {key}")
    print()

    encoded = encode(carrier, message, key)
    print(f"  Encoded : {encoded}")
    print()

    decoded = decode(encoded)
    print(f"  Decoded message : {decoded['message']}")
    print(f"  Decoded key     : {decoded['key']}")
    print(f"  Round-trip       : {'✓' if decoded['message'] == message else '✗'}")
    print()

    # Verify
    msg_digits = ''.join(str(ord(c)) for c in message)
    enc_digits = vigenere_encrypt_digits(msg_digits, key)
    dec_digits = vigenere_decrypt_digits(enc_digits, key)
    print(f"  Message digits   : {msg_digits}")
    print(f"  Encrypted digits : {enc_digits}")
    print(f"  Decrypted digits : {dec_digits}")
    print(f"  Digit round-trip : {'✓' if dec_digits == msg_digits else '✗'}")
