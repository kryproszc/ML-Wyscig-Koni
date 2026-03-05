CASE
    WHEN v17a.C0180 IS NOT NULL THEN
        (v25.C0010 / NULLIF(v05a.C0200,0)) *
        CASE 
            WHEN v25.TYP_OKRESU = 'R' THEN 1
            ELSE MONTH(v25.DATA_SPR) / 12.0
        END

    WHEN v17b.C0180 IS NOT NULL THEN
        (v25.C0010 / NULLIF(v05b.C0200,0)) *
        CASE 
            WHEN v25.TYP_OKRESU = 'R' THEN 1
            ELSE MONTH(v25.DATA_SPR) / 12.0
        END

    ELSE NULL
END AS SCR_majatkowy_do_skladka_zarobiona
