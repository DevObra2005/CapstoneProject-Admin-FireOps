<?php

namespace App\Support;

/**
 * ONE place that creates auto-generated passwords for FireOps.
 *
 * Used by:
 *   - SuperAdmin\StaffController      (new staff accounts)
 *   - Staff\ParticipantController     (manual add + Excel import)
 *
 * Every generated password passes the central rule in AppServiceProvider
 * (8+ characters, uppercase, lowercase, number, symbol), so the system
 * never hands out a password that its own rule would reject.
 */
class PasswordGenerator
{
    /**
     * Excluded characters: I, O, i, l, o, 0, 1 — these are visually
     * ambiguous and cause "wrong password" failures that look like bugs.
     * Symbols are limited to @ # ! $, which sit on the first symbol page
     * of most phone keyboards.
     */
    private const GROUPS = [
        'ABCDEFGHJKLMNPQRSTUVWXYZ',   // uppercase (no I, O)
        'abcdefghjkmnpqrstuvwxyz',    // lowercase (no i, l, o)
        '23456789',                   // numbers   (no 0, 1)
        '@#!$',                       // symbols   (phone-friendly)
    ];

    /**
     * HOW IT GUARANTEES THE RULE:
     *   1. Pick ONE character from each group (upper, lower, number, symbol).
     *   2. Fill the remaining length from all groups combined.
     *   3. Shuffle, so the guaranteed characters aren't always at the start.
     *
     * random_int() is cryptographically secure (unlike rand() or
     * str_shuffle()), which matters because this string is the only thing
     * protecting the account — so the shuffle uses random_int() too.
     */
    public static function generate(int $length = 10): string
    {
        // Never shorter than the central rule's minimum
        $length = max($length, 8);

        $chars = [];

        // Step 1: one guaranteed character from each group
        foreach (self::GROUPS as $group) {
            $chars[] = $group[random_int(0, strlen($group) - 1)];
        }

        // Step 2: fill the rest from every group combined
        $all = implode('', self::GROUPS);
        for ($i = count($chars); $i < $length; $i++) {
            $chars[] = $all[random_int(0, strlen($all) - 1)];
        }

        // Step 3: secure shuffle (Fisher–Yates with random_int)
        for ($i = count($chars) - 1; $i > 0; $i--) {
            $j = random_int(0, $i);
            [$chars[$i], $chars[$j]] = [$chars[$j], $chars[$i]];
        }

        return implode('', $chars);
    }
}