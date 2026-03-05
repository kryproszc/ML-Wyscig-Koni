CASE
    WHEN v17a.C0180 IS NOT NULL
        THEN v25.C0010 /
        NULLIF(
            (
                v05a.C0200 *
                (
                    CASE
                        WHEN v25.TYP_OKRESU = 'R' THEN 4
                        ELSE MONTH(v25.DATA_SPR) / 3
                    END
                ) / 4
            )
        ,0)

    WHEN v17b.C0180 IS NOT NULL
        THEN v25.C0010 /
        NULLIF(
            (
                v05b.C0200 *
                (
                    CASE
                        WHEN v25.TYP_OKRESU = 'R' THEN 4
                        ELSE MONTH(v25.DATA_SPR) / 3
                    END
                ) / 4
            )
        ,0)

    ELSE NULL
END AS SCR_majatkowy_do_skladka_zarobiona
