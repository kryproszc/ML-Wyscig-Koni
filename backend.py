WITH suma_R0960 AS
(
    SELECT
        DATA_SPR,
        TYP_OKRESU,
        KOD_ZU,
        SUM(R0960) AS SUMA_R0960
    FROM SNU_ANA.dbo.V_S_26_13_01_07_DIU
    GROUP BY
        DATA_SPR,
        TYP_OKRESU,
        KOD_ZU
)
